import { InterpretationResponseSchema } from "../src/features/v2-conversation-prep/interpretation";
import { interpretConversationTurn } from "../src/server/conversation/interpret";
import { readMetaProposalConfig } from "../src/server/ai/meta/config";

async function main() {
  if (!process.argv.includes("--live")) {
    console.log(JSON.stringify({ check: "meta-text", status: "LIVE_OPT_IN_REQUIRED", liveRequestMade: false }));
    process.exitCode = 2; return;
  }
  if (!readMetaProposalConfig()) {
    console.log(JSON.stringify({ check: "meta-text", status: "NOT_CONFIGURED", liveRequestMade: false }));
    process.exitCode = 2; return;
  }
  // Own synthetic text only. This route cannot save, book, select or read a tenant.
  const response = InterpretationResponseSchema.parse(await interpretConversationTurn({
    schemaVersion: "2.0", inputRevision: 1, language: "en", currentField: "unitQuantity",
    text: "12 pallets of machine parts, 100 kg per pallet.",
  }));
  const quantity = response.declarationProposal?.fields.find(field => field.field === "unitQuantity");
  const weight = response.declarationProposal?.fields.find(field => field.field === "unitWeightKg");
  const unit = response.declarationProposal?.fields.find(field => field.field === "unitType");
  const valid = response.mode === "META" && response.providerMetadata?.transport === "META_MODEL_API" &&
    quantity?.value === 12 && weight?.value === 100 && unit?.value === "PALLET" &&
    response.declarationProposal?.missingFields.includes("unitLengthCm") &&
    response.declarationProposal?.missingFields.includes("unitWidthCm") &&
    response.declarationProposal?.missingFields.includes("unitHeightCm");
  console.log(JSON.stringify({
    check: "meta-text", status: valid ? "PASS" : "FAILED_ACCEPTANCE",
    liveRequestMade: (response.providerMetadata?.attempts ?? 0) > 0,
    mode: response.mode, metadata: response.providerMetadata ?? null,
    error: response.providerError ?? null,
    expectedOwnSyntheticValuesMatched: Boolean(valid),
    commercialWrites: 0,
  }, null, 2));
  if (!valid) process.exitCode = 1;
}
main().catch(() => {
  // Do not serialize SDK exceptions, environment, messages or raw provider replies.
  console.log(JSON.stringify({ check: "meta-text", status: "FAILED", privateDetailsOmitted: true }));
  process.exitCode = 1;
});
