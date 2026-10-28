import "server-only";
import { z } from "zod";
import {
  DeclarationInputSchema, ModelProposalSchema,
  ProposalMetadataSchema, type DeclarationInput, type ModelProposal, type ProposalErrorCode,
} from "@/shared/schemas/meta/model-proposal";
import { readMetaProposalConfig, type MetaProposalConfig, type MetaEnvironment } from "./config";
import { declarationResponseFormat } from "./schemas";
import { validateProposalContext, type ProposalScope } from "./proposal-validation";
export type { ProposalScope } from "./proposal-validation";

const ProviderReplySchema = z.object({
  content: z.string().max(32_768),
  requestId: z.string().regex(/^[a-zA-Z0-9_-]{1,100}$/).nullable(),
  model: z.string().max(100),
  usage: z.object({
    inputTokens: z.number().int().nonnegative().max(1_000_000).nullable(),
    outputTokens: z.number().int().nonnegative().max(1_000_000).nullable(),
  }).strict().nullable(),
}).strict();

export type ProposalTelemetry = z.infer<typeof ProposalMetadataSchema>;
export type ProposalResult =
  | { ok: true; proposal: ModelProposal; metadata: ProposalTelemetry }
  | { ok: false; error: { code: ProposalErrorCode; retryable: boolean }; metadata: ProposalTelemetry };

export type InvokeProposal = (request: {
  input: DeclarationInput;
  config: MetaProposalConfig;
  responseFormat: typeof declarationResponseFormat;
  signal: AbortSignal;
  attempt: number;
}) => Promise<unknown>;

/** AX-00 injected transport contract; no default network, persistence or business tools. */
export async function proposeDeclaration(
  rawInput: unknown,
  scope: ProposalScope,
  dependencies: {
    invoke: InvokeProposal;
    transport?: ProposalTelemetry["transport"];
    textOnly?: boolean;
    env?: MetaEnvironment;
    onTelemetry?: (metadata: ProposalTelemetry) => void;
  },
): Promise<ProposalResult> {
  const started = performance.now();
  const config = readMetaProposalConfig(dependencies.env);
  const metadata: ProposalTelemetry = {
    provider: "META", transport: dependencies.transport ?? "INJECTED", model: config?.model ?? null,
    requestId: null, latencyMs: 0, attempts: 0, inputTokens: null,
    outputTokens: null, estimatedCostUsd: null, outcome: "NOT_CONFIGURED",
  };
  const emit = (outcome: ProposalTelemetry["outcome"]) => {
    metadata.latencyMs = Math.max(0, Math.round(performance.now() - started));
    metadata.outcome = outcome;
    // The only log seam is an allowlisted DTO; never pass an exception or raw reply.
    try { dependencies.onTelemetry?.({ ...metadata }); } catch { /* Logging cannot fail the request. */ }
    return { ...metadata };
  };
  const fail = (code: ProposalErrorCode, retryable = false): ProposalResult =>
    ({ ok: false, error: { code, retryable }, metadata: emit(code) });

  const parsed = DeclarationInputSchema.safeParse(rawInput);
  if (!parsed.success) return fail("VALIDATION_ERROR");
  const input = parsed.data;
  if (input.inputRevision !== scope.currentInputRevision) return fail("INPUT_REVISION_MISMATCH");
  if (input.evidence.some(item => !scope.authorizedEvidenceIds.includes(item.evidenceId)))
    return fail("FORBIDDEN_TENANT");
  if (dependencies.textOnly && input.evidence.length) return fail("MEDIA_INVALID");
  if (!config) return fail("NOT_CONFIGURED");

  const controller = new AbortController();
  // One total deadline, at most two attempts; the future SDK adapter must use maxRetries: 0.
  const timer = setTimeout(() => controller.abort(), config.timeoutMs);
  const timeout = new Promise<never>((_, reject) => {
    controller.signal.addEventListener("abort", () => reject(new Error("PROVIDER_TIMEOUT")), { once: true });
  });
  try {
    for (let attempt = 1; attempt <= 2; attempt++) {
      metadata.attempts = attempt;
      let rawReply: unknown;
      try {
        rawReply = await Promise.race([
          dependencies.invoke({ input: structuredClone(input), config: { ...config },
            responseFormat: declarationResponseFormat, signal: controller.signal, attempt }),
          timeout,
        ]);
      } catch {
        metadata.inputTokens = null;
        metadata.outputTokens = null;
        return fail("PROVIDER_UNAVAILABLE", true);
      }
      const reply = ProviderReplySchema.safeParse(rawReply);
      let proposal: ReturnType<typeof ModelProposalSchema.safeParse> | null = null;
      if (reply.success && reply.data.model === config.model) {
        metadata.requestId = reply.data.requestId;
        // Usage is summed across attempts; missing usage remains unknown.
        const usage = reply.data.usage;
        metadata.inputTokens = attempt === 1 ? usage?.inputTokens ?? null :
          metadata.inputTokens !== null && usage?.inputTokens != null ? metadata.inputTokens + usage.inputTokens : null;
        metadata.outputTokens = attempt === 1 ? usage?.outputTokens ?? null :
          metadata.outputTokens !== null && usage?.outputTokens != null ? metadata.outputTokens + usage.outputTokens : null;
        try { proposal = ModelProposalSchema.safeParse(JSON.parse(reply.data.content)); } catch { /* Invalid JSON. */ }
      } else {
        metadata.inputTokens = null;
        metadata.outputTokens = null;
      }
      if (!proposal?.success) {
        if (attempt === 1 && !controller.signal.aborted) continue;
        return fail("MODEL_OUTPUT_INVALID");
      }
      const checked = validateProposalContext(proposal.data, input, scope);
      if (!checked.ok) {
        if (checked.code === "MODEL_OUTPUT_INVALID" && attempt === 1 && !controller.signal.aborted) continue;
        return fail(checked.code);
      }
      return { ok: true, proposal: checked.proposal, metadata: emit(checked.proposal.status) };
    }
    return fail("MODEL_OUTPUT_INVALID");
  } finally {
    clearTimeout(timer);
  }
}
