import { z } from "zod";

export const DeclarationFieldSchema = z.enum([
  "cargoDescription", "unitType", "unitQuantity", "unitWeightKg",
  "unitLengthCm", "unitWidthCm", "unitHeightCm", "handlingRequirements",
]);
export const CargoUnitSchema = z.enum(["PALLET", "BOX"]);
export const EvidenceKindSchema = z.enum(["photo", "label", "audio"]);
export const ProposalSourceSchema = z.object({
  source: z.enum(["text", "photo", "label", "audio"]),
  evidenceId: z.string().uuid().nullable(),
  inputRevision: z.number().int().nonnegative(),
  basis: z.enum(["EXPLICIT", "VISIBLE"]),
  quote: z.string().min(1).max(500).nullable(),
}).strict();

const positive = z.number().finite().positive();
const sourced = <F extends string, T extends z.ZodTypeAny>(field: F, value: T) =>
  z.object({ field: z.literal(field), value, provenance: ProposalSourceSchema }).strict();

// No totals, prices, commands, tenant identifiers or confirmation state.
export const ProposedDeclarationFieldSchema = z.discriminatedUnion("field", [
  sourced("cargoDescription", z.string().min(1).max(500)),
  sourced("unitType", CargoUnitSchema),
  sourced("unitQuantity", positive.int().max(1_000_000)),
  sourced("unitWeightKg", positive.max(1_000_000)),
  sourced("unitLengthCm", positive.max(100_000)),
  sourced("unitWidthCm", positive.max(100_000)),
  sourced("unitHeightCm", positive.max(100_000)),
  sourced("handlingRequirements", z.array(z.string().min(1).max(120)).min(1).max(12)),
]);

export const DeclarationInputSchema = z.object({
  schemaVersion: z.literal("1.0"),
  inputRevision: z.number().int().nonnegative(),
  language: z.enum(["en", "es"]),
  text: z.string().trim().min(1).max(6_000).nullable(),
  evidence: z.array(z.object({
    evidenceId: z.string().uuid(),
    kind: EvidenceKindSchema,
    // Server-resolved transcript/OCR when available; not a URL or storage key.
    text: z.string().trim().min(1).max(6_000).nullable(),
  }).strict()).max(4),
}).strict().superRefine((input, ctx) => {
  if (!input.text && input.evidence.length === 0)
    ctx.addIssue({ code: "custom", message: "Text or evidence is required." });
  if (new Set(input.evidence.map(item => item.evidenceId)).size !== input.evidence.length)
    ctx.addIssue({ code: "custom", message: "Evidence references must be unique." });
  if ((input.text?.length ?? 0) + input.evidence.reduce((sum, item) => sum + (item.text?.length ?? 0), 0) > 12_000)
    ctx.addIssue({ code: "custom", message: "Combined text exceeds the input limit." });
});

// Structural schema is also used to generate the provider's JSON Schema.
export const ModelProposalShapeSchema = z.object({
  schemaVersion: z.literal("1.0"),
  inputRevision: z.number().int().nonnegative(),
  status: z.enum(["PROPOSED", "REFUSED"]),
  refusalReason: z.enum(["UNSUPPORTED_CONTENT", "NOT_A_CARGO_DECLARATION"]).nullable(),
  fields: z.array(ProposedDeclarationFieldSchema).max(8),
  missingFields: z.array(DeclarationFieldSchema).max(8),
  warnings: z.array(z.enum([
    "VISIBLE_COUNT_ONLY", "NO_SCALE", "UNVERIFIED_LABEL", "INCOMPLETE_DECLARATION",
  ])).max(4),
  requiresHumanConfirmation: z.literal(true),
}).strict();

export const ModelProposalSchema = ModelProposalShapeSchema.superRefine((proposal, ctx) => {
  const fields = proposal.fields.map(item => item.field);
  if (new Set(fields).size !== fields.length ||
      new Set(proposal.missingFields).size !== proposal.missingFields.length ||
      new Set(proposal.warnings).size !== proposal.warnings.length)
    ctx.addIssue({ code: "custom", message: "Duplicate fields or warnings." });
  if (proposal.missingFields.some(field => fields.includes(field)))
    ctx.addIssue({ code: "custom", message: "A field cannot be proposed and missing." });
  if (proposal.status === "REFUSED" && (!proposal.refusalReason || fields.length !== 0))
    ctx.addIssue({ code: "custom", message: "Refusal requires a reason and no fields." });
  if (proposal.status === "PROPOSED" && (proposal.refusalReason !== null ||
      (fields.length === 0 && proposal.missingFields.length === 0)))
    ctx.addIssue({ code: "custom", message: "Proposal requires fields or missing information." });
  for (const item of proposal.fields) {
    const source = item.provenance;
    if ((typeof item.value === "string" && !item.value.trim()) ||
        (Array.isArray(item.value) && item.value.some(value => !value.trim())))
      ctx.addIssue({ code: "custom", message: "Proposed text cannot be blank." });
    if (source.quote !== null && !source.quote.trim())
      ctx.addIssue({ code: "custom", message: "Source excerpt cannot be blank." });
    if (source.inputRevision !== proposal.inputRevision)
      ctx.addIssue({ code: "custom", message: "Field revision differs from proposal." });
    if ((source.source === "text") !== (source.evidenceId === null))
      ctx.addIssue({ code: "custom", message: "Source/evidence reference mismatch." });
    if (source.source === "photo") {
      if (source.basis !== "VISIBLE" || source.quote !== null ||
          !["cargoDescription", "unitType", "unitQuantity"].includes(item.field))
        ctx.addIssue({ code: "custom", message: "Photo appearance only supports visible description/unit/count." });
      if (!proposal.warnings.includes("NO_SCALE") ||
          (item.field === "unitQuantity" && !proposal.warnings.includes("VISIBLE_COUNT_ONLY")))
        ctx.addIssue({ code: "custom", message: "Visible observations need limitations." });
    } else if (source.basis !== "EXPLICIT" || !source.quote) {
      ctx.addIssue({ code: "custom", message: "Explicit sources need an excerpt." });
    }
    if (source.source === "label" && !proposal.warnings.includes("UNVERIFIED_LABEL"))
      ctx.addIssue({ code: "custom", message: "Label extraction remains unverified." });
  }
});

export const ProposalErrorCodeSchema = z.enum([
  "VALIDATION_ERROR", "FORBIDDEN_TENANT", "NOT_CONFIGURED", "PROVIDER_UNAVAILABLE",
  "MODEL_OUTPUT_INVALID", "MEDIA_INVALID", "INPUT_REVISION_MISMATCH",
  "SESSION_SCOPE_INCOMPLETE", "INCOMPATIBLE_UNIT", "OBSERVATION_INSUFFICIENT",
]);
export const ProposalErrorSchema = z.object({
  code: ProposalErrorCodeSchema,
  retryable: z.boolean(),
}).strict();

export const ProposalMetadataSchema = z.object({
  provider: z.literal("META"),
  transport: z.enum(["INJECTED", "META_MODEL_API"]),
  model: z.string().max(100).nullable(),
  requestId: z.string().regex(/^[a-zA-Z0-9_-]{1,100}$/).nullable(),
  latencyMs: z.number().nonnegative(),
  attempts: z.number().int().min(0).max(2),
  inputTokens: z.number().int().nonnegative().nullable(),
  outputTokens: z.number().int().nonnegative().nullable(),
  estimatedCostUsd: z.null(),
  outcome: z.union([z.enum(["PROPOSED", "REFUSED"]), ProposalErrorCodeSchema]),
}).strict();

export type DeclarationInput = z.infer<typeof DeclarationInputSchema>;
export type ModelProposal = z.infer<typeof ModelProposalSchema>;
export type ProposalErrorCode = z.infer<typeof ProposalErrorCodeSchema>;
export type CargoUnit = z.infer<typeof CargoUnitSchema>;
