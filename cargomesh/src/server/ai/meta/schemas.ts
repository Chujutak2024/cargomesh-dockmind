import "server-only";
import { zodResponseFormat } from "openai/helpers/zod";
import { ModelProposalShapeSchema } from "@/shared/schemas/meta/model-proposal";

// Same structural source as server validation; cross-field guards run separately.
export const declarationResponseFormat = zodResponseFormat(
  ModelProposalShapeSchema,
  "cargo_declaration_proposal_v1",
);
