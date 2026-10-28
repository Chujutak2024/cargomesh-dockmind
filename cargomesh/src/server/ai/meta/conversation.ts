import "server-only";
import { z } from "zod";
import { zodResponseFormat } from "openai/helpers/zod";
import {
  ConversationFieldNameSchema, InterpretationRequestSchema, InterpretationSchema,
  interpretDeterministically, type InterpretationRequest,
} from "@/features/v2-conversation-prep/interpretation";
import {
  ModelProposalShapeSchema, type DeclarationInput, type ModelProposal, type ProposalErrorCode,
} from "@/shared/schemas/meta/model-proposal";
import { readMetaProposalConfig, type MetaEnvironment } from "./config";
import { requestMetaJson, InvalidMetaOutput, type MetaFetch } from "./client";
import { validateProposalContext } from "./proposal-validation";
import { DECLARATION_INSTRUCTIONS } from "./interpret-declaration";
import type { ProposalTelemetry } from "./proposal-boundary";

// Cargo fields must pass the AX-00 provenance contract, not a second untracked path.
const NonCargoFieldSchema = ConversationFieldNameSchema.exclude([
  "packaging", "cargoDescription", "unitQuantity", "unitWeightPerUnitKg", "unitVolumePerUnitM3",
  "unitLengthCm", "unitWidthCm", "unitHeightCm", "requirements",
  "pickupContactName", "pickupContactPhoneE164", "pickupContactEmail",
  "recipientContactName", "recipientContactPhoneE164", "recipientContactEmail",
]);
export const MetaConversationShapeSchema = z.object({
  intent: z.enum(["PROVIDE", "CORRECT", "HELP"]),
  fields: z.array(z.object({
    field: NonCargoFieldSchema,
    value: z.string().min(1).max(200),
    quote: z.string().min(1).max(500),
  }).strict()).max(12),
  acknowledgment: z.string().min(1).max(420),
  declaration: ModelProposalShapeSchema.nullable(),
}).strict();
export const metaConversationResponseFormat = zodResponseFormat(MetaConversationShapeSchema, "cargo_chat_turn_v1");

const instructions = [
  "You are CargoMesh, a freight request guide. Return only the specified JSON for the latest chat turn.",
  "Reply naturally in requested language en/es. For HELP answer the actual question, then ask one useful question.",
  "For PROVIDE/CORRECT, acknowledge only the newly proposed facts without a question; the application chooses the next form field.",
  "Context is a provisional draft, never proof of truth, authorization, availability or coverage.",
  "Extract only facts explicitly stated or corrected in the latest text. Never repeat old context as new fields.",
  "For non-cargo fields cite an exact excerpt from the latest text in quote. Do not guess dates, years or time zones.",
  "All quantities, packaging, descriptions, mass, dimensions and requirements go in declaration with AX-00 provenance.",
  "When no cargo facts are stated use declaration=null. For HELP return fields=[] and declaration=null.",
  "Return at most twelve fields after mapping the declaration and non-cargo fields together.",
  "An input currentField indicates what was asked, not permission to turn a question into a value.",
  "Do not propose contact information. No tools, prices, bookings, payments, availability or commercial claims.",
  "This interface prepares a provisional ROAD request. Saving needs explicit review/confirmation in the application.",
  "Never claim to have saved, booked, selected, paid, confirmed a carrier, or inspected a file.",
  "Only text is supported in this cut. A referenced photo, document or audio has not been inspected.",
  DECLARATION_INSTRUCTIONS,
].join(" ");

function mapDeclaration(proposal: ModelProposal) {
  return proposal.fields.map(item => ({
    field: item.field === "unitType" ? "packaging" :
      item.field === "unitWeightKg" ? "unitWeightPerUnitKg" :
      item.field === "handlingRequirements" ? "requirements" : item.field,
    value: Array.isArray(item.value) ? item.value.join(", ") : String(item.value),
  }));
}

export async function interpretMetaConversationTurn(input: InterpretationRequest,
  options: { env?: MetaEnvironment; fetch?: MetaFetch } = {}) {
  input = InterpretationRequestSchema.parse(input);
  const config = readMetaProposalConfig(options.env);
  const fallback = interpretDeterministically(input);
  const started = performance.now();
  const revision = input.inputRevision ?? 0;
  const metadata: ProposalTelemetry = {
    provider: "META", transport: options.fetch ? "INJECTED" : "META_MODEL_API", model: config?.model ?? null,
    requestId: null, latencyMs: 0, attempts: 0, inputTokens: null, outputTokens: null,
    estimatedCostUsd: null, outcome: "NOT_CONFIGURED",
  };
  const fail = (code: ProposalErrorCode, retryable = false) => {
    metadata.outcome = code;
    metadata.latencyMs = Math.round(performance.now() - started);
    return {
      schemaVersion: "2.0" as const, mode: "DETERMINISTIC" as const, telemetry: null,
      interpretation: fallback, inputRevision: revision,
      providerError: { code, retryable }, providerMetadata: { ...metadata },
    };
  };
  if (!config) return fail("NOT_CONFIGURED");
  const declarationInput: DeclarationInput = {
    schemaVersion: "1.0", inputRevision: revision, text: input.text, language: input.language ?? "en", evidence: [],
  };
  // A cancellable timer avoids keeping the request alive after a successful response.
  const controller = new AbortController();
  const deadlineTimer = setTimeout(() => controller.abort(), config.timeoutMs);
  const bounded = new Promise<never>((_, reject) => {
    controller.signal.addEventListener("abort", () => reject(new Error("Meta deadline")), { once: true });
  });
  try {
    for (let attempt = 1; attempt <= 2; attempt++) {
      metadata.attempts = attempt;
      try {
        const reply = await Promise.race([
          requestMetaJson({
            config, instructions, responseFormat: metaConversationResponseFormat, signal: controller.signal,
            payload: { ...input, inputRevision: revision }, fetch: options.fetch,
          }), bounded,
        ]);
        metadata.requestId = reply.requestId;
        metadata.inputTokens = attempt === 1 ? reply.usage?.inputTokens ?? null :
          metadata.inputTokens !== null && reply.usage?.inputTokens != null ? metadata.inputTokens + reply.usage.inputTokens : null;
        metadata.outputTokens = attempt === 1 ? reply.usage?.outputTokens ?? null :
          metadata.outputTokens !== null && reply.usage?.outputTokens != null ? metadata.outputTokens + reply.usage.outputTokens : null;
        let decoded: unknown;
        try { decoded = JSON.parse(reply.content); } catch { throw new InvalidMetaOutput(); }
        const parsed = MetaConversationShapeSchema.safeParse(decoded);
        if (!parsed.success) throw new InvalidMetaOutput();
        const turn = parsed.data;
        if (new Set(turn.fields.map(field => field.field)).size !== turn.fields.length ||
            turn.fields.some(field => !input.text.includes(field.quote) || !field.value.trim()) ||
            (turn.intent === "HELP" && (turn.fields.length || turn.declaration !== null)) ||
            (turn.intent !== "HELP" && /[?¿]/.test(turn.acknowledgment)) ||
            (fallback.intent === "HELP" && turn.intent !== "HELP") ||
            /\bI (?:have )?(?:saved|booked|paid|confirmed|selected|created)\b|\bhe (?:guardado|reservado|pagado|confirmado|seleccionado)\b|[$€£]/i.test(turn.acknowledgment))
          throw new InvalidMetaOutput();
        let proposal: ModelProposal | null = null;
        if (turn.declaration) {
          const validated = validateProposalContext(turn.declaration, declarationInput, {
            currentInputRevision: revision, authorizedEvidenceIds: [], expectedUnit: null,
          });
          if (!validated.ok) {
            if (validated.code === "INPUT_REVISION_MISMATCH") return fail(validated.code);
            throw new InvalidMetaOutput();
          }
          proposal = validated.proposal;
        }
        const fields = turn.intent === "HELP" || proposal?.status === "REFUSED" ? [] :
          [...turn.fields.map(({ field, value }) => ({ field, value })), ...(proposal ? mapDeclaration(proposal) : [])];
        const interpretation = InterpretationSchema.safeParse({
          intent: turn.intent, fields, acknowledgment: turn.acknowledgment,
        });
        if (!interpretation.success) throw new InvalidMetaOutput();
        metadata.latencyMs = Math.round(performance.now() - started);
        metadata.outcome = proposal?.status ?? "PROPOSED";
        return {
          schemaVersion: "2.0" as const, mode: "META" as const, telemetry: null,
          interpretation: interpretation.data, inputRevision: revision,
          declarationProposal: proposal, providerMetadata: { ...metadata },
        };
      } catch (error) {
        if (error instanceof InvalidMetaOutput && error.missingUsage) {
          metadata.inputTokens = null; metadata.outputTokens = null;
        }
        if (error instanceof InvalidMetaOutput && attempt === 1 && !controller.signal.aborted) continue;
        if (error instanceof InvalidMetaOutput) return fail("MODEL_OUTPUT_INVALID");
        metadata.inputTokens = null; metadata.outputTokens = null;
        return fail("PROVIDER_UNAVAILABLE", true);
      }
    }
    return fail("MODEL_OUTPUT_INVALID");
  } finally {
    clearTimeout(deadlineTimer);
  }
}
