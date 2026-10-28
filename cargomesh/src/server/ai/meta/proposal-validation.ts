import "server-only";
import { ModelProposalSchema, type DeclarationInput, type CargoUnit,
  type ModelProposal, type ProposalErrorCode } from "@/shared/schemas/meta/model-proposal";

export type ProposalScope = {
  currentInputRevision: number;
  authorizedEvidenceIds: readonly string[];
  expectedUnit: CargoUnit | null;
};

export function validateProposalContext(raw: unknown, input: DeclarationInput, scope: ProposalScope):
  { ok: true; proposal: ModelProposal } | { ok: false; code: ProposalErrorCode } {
  const parsed = ModelProposalSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, code: "MODEL_OUTPUT_INVALID" };
  const proposal = parsed.data;
  if (proposal.inputRevision !== input.inputRevision || scope.currentInputRevision !== input.inputRevision)
    return { ok: false, code: "INPUT_REVISION_MISMATCH" };
  for (const field of proposal.fields) {
    const source = field.provenance;
    const evidence = input.evidence.find(item => item.evidenceId === source.evidenceId);
    if (source.source !== "text" && (!evidence || evidence.kind !== source.source ||
        !scope.authorizedEvidenceIds.includes(evidence.evidenceId)))
      return { ok: false, code: "MODEL_OUTPUT_INVALID" };
    const text = source.source === "text" ? input.text : evidence?.text;
    if (source.basis === "EXPLICIT" && text != null && !text.includes(source.quote!))
      return { ok: false, code: "MODEL_OUTPUT_INVALID" };
    if (source.source === "text" && !input.text)
      return { ok: false, code: "MODEL_OUTPUT_INVALID" };
    if (field.field === "unitType" && scope.expectedUnit && field.value !== scope.expectedUnit)
      return { ok: false, code: "INCOMPATIBLE_UNIT" };
  }
  return { ok: true, proposal };
}
