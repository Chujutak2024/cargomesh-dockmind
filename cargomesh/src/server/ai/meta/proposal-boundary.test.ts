import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import {
  DeclarationInputSchema, ModelProposalSchema, ModelProposalShapeSchema, ProposalErrorSchema,
} from "@/shared/schemas/meta/model-proposal";
import { readMetaProposalConfig } from "./config";
import { declarationResponseFormat } from "./schemas";
import { proposeDeclaration, type ProposalScope, type ProposalTelemetry } from "./proposal-boundary";
import success from "../../../../../docs/meta/contracts/fixtures/success.json";
import missing from "../../../../../docs/meta/contracts/fixtures/missing.json";
import refusal from "../../../../../docs/meta/contracts/fixtures/refusal.json";
import unavailable from "../../../../../docs/meta/contracts/fixtures/unavailable.json";
import invalid from "../../../../../docs/meta/contracts/fixtures/invalid.json";

const env: Readonly<Record<string, string | undefined>> = {
  CARGOMESH_AI_PROVIDER: "META", META_MODEL_API_KEY: "synthetic-key-do-not-log",
  META_MUSE_MODEL: "muse-spark-1.3",
};
const scope = (ids: string[] = []): ProposalScope => ({
  currentInputRevision: 7, authorizedEvidenceIds: ids, expectedUnit: null,
});
const proposal = () => ModelProposalShapeSchema.parse(success.proposal);
const reply = (content: unknown = success.proposal) => ({
  content: JSON.stringify(content), requestId: "synthetic-request",
  model: "muse-spark-1.3", usage: { inputTokens: 100, outputTokens: 20 },
});
const errorCode = (result: Awaited<ReturnType<typeof proposeDeclaration>>) => {
  assert.equal(result.ok, false);
  if (result.ok) throw new Error("Expected error");
  return result.error.code;
};

test("labeled fixtures validate; refusal does not propose business actions", () => {
  for (const fixture of [success, missing, refusal]) {
    assert.equal(fixture.fixtureType, "SYNTHETIC_NO_INFERENCE");
    DeclarationInputSchema.parse(fixture.input);
    ModelProposalSchema.parse(fixture.proposal);
  }
  ProposalErrorSchema.parse(unavailable.expectedError);
  assert.equal(ModelProposalSchema.safeParse(invalid.proposal).success, false);
});

test("strict provider JSON Schema is generated from the shared Zod shape", () => {
  assert.equal(declarationResponseFormat.type, "json_schema");
  const schema = declarationResponseFormat.json_schema.schema!;
  assert.equal(schema.additionalProperties, false);
  assert.equal(schema.type, "object");
  assert.equal(declarationResponseFormat.json_schema.strict, true);
  assert.deepEqual(Object.keys(schema.properties as object).sort(),
    Object.keys(ModelProposalShapeSchema.shape).sort());
  const portable = JSON.parse(readFileSync(new URL(
    "../../../../../docs/meta/contracts/model-proposal.schema.json", import.meta.url), "utf8"));
  assert.deepEqual(portable, schema);
  assert.doesNotMatch(JSON.stringify(schema), /apiKey|createBooking|price|organizationId/);
});

test("success remains a proposal with unknown dimensions, no calculated totals", async () => {
  const result = await proposeDeclaration(success.input, scope(), { env, invoke: async request => {
    assert.equal(request.config.baseURL, "https://api.meta.ai/v1");
    assert.equal(request.responseFormat.type, "json_schema");
    return reply();
  } });
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.proposal.requiresHumanConfirmation, true);
  assert.deepEqual(result.proposal.missingFields, success.proposal.missingFields);
  assert.equal(result.metadata.transport, "INJECTED");
  assert.equal(result.metadata.estimatedCostUsd, null);
  assert.equal(result.metadata.inputTokens, 100);
  assert.equal(result.proposal.fields.some(field => String(field.field) === "totalWeightKg"), false);
});

test("missing key/model or disabled provider never invokes a transport", async () => {
  let calls = 0;
  for (const config of [{}, { ...env, META_MODEL_API_KEY: "" },
    { ...env, META_MUSE_MODEL: "" }, { ...env, CARGOMESH_AI_PROVIDER: "BEDROCK" }]) {
    const result = await proposeDeclaration(success.input, scope(), {
      env: config, invoke: async () => { calls++; return reply(); },
    });
    assert.equal(errorCode(result), "NOT_CONFIGURED");
    assert.equal(result.metadata.attempts, 0);
  }
  assert.equal(calls, 0);
});

test("configuration rejects key routing to another provider and unsafe limits", () => {
  for (const config of [
    { META_MODEL_BASE_URL: "https://other-provider.example/v1" },
    { META_MODEL_BASE_URL: "http://api.meta.ai/v1" },
    { META_MUSE_MODEL: "muse-spark-contributor" },
    { META_MUSE_MODEL: "muse-image-1" },
    { META_PROPOSAL_TIMEOUT_MS: "45001" },
    { META_PROPOSAL_MAX_OUTPUT_TOKENS: "999999" },
  ]) assert.equal(readMetaProposalConfig({ ...env, ...config }), null);
  assert.equal(readMetaProposalConfig({ ...env, META_MODEL_BASE_URL: "https://api.meta.ai/v1/" })?.model,
    "muse-spark-1.3");
});

test("oversized, empty, duplicate or extra-key input fails before invocation", async () => {
  let calls = 0;
  for (const input of [
    { ...success.input, organizationId: "browser-controlled" },
    { ...success.input, text: null },
    { ...success.input, text: "x".repeat(6001) },
    { ...missing.input, evidence: [...missing.input.evidence, ...missing.input.evidence] },
  ]) {
    const result = await proposeDeclaration(input, scope(), { env, invoke: async () => {
      calls++; return reply();
    } });
    assert.equal(errorCode(result), "VALIDATION_ERROR");
  }
  assert.equal(calls, 0);
});

test("foreign evidence and stale input are rejected before any provider call", async () => {
  let calls = 0;
  const deps = { env, invoke: async () => { calls++; return reply(); } };
  assert.equal(errorCode(await proposeDeclaration(missing.input, scope(), deps)), "FORBIDDEN_TENANT");
  assert.equal(errorCode(await proposeDeclaration({ ...success.input, inputRevision: 6 }, scope(), deps)),
    "INPUT_REVISION_MISMATCH");
  assert.equal(calls, 0);
});

test("unknown output fields get only one validation retry", async () => {
  let calls = 0;
  const result = await proposeDeclaration(success.input, scope(), { env, invoke: async () => {
    calls++; return reply(invalid.proposal);
  } });
  assert.equal(errorCode(result), "MODEL_OUTPUT_INVALID");
  assert.equal(calls, 2);
});

test("one corrected output is accepted and usage accounts for both attempts", async () => {
  let calls = 0;
  const result = await proposeDeclaration(success.input, scope(), { env,
    invoke: async () => reply(++calls === 1 ? invalid.proposal : success.proposal),
  });
  assert.equal(result.ok, true);
  assert.equal(calls, 2);
  assert.equal(result.metadata.inputTokens, 200);
  assert.equal(result.metadata.outputTokens, 40);
});

test("invalid JSON, model mismatch and oversized responses cannot bypass validation", async () => {
  for (const value of [
    { ...reply(), content: "{not json" }, { ...reply(), model: "another-model" },
    { ...reply(), content: "x".repeat(32769) },
  ]) {
    const result = await proposeDeclaration(success.input, scope(), { env, invoke: async () => value });
    assert.equal(errorCode(result), "MODEL_OUTPUT_INVALID");
    assert.equal(result.metadata.attempts, 2);
  }
});

test("duplicates, missing/proposed overlap, negative quantity and fake confirmation fail", () => {
  const valid = proposal();
  for (const output of [
    { ...valid, fields: [...valid.fields, valid.fields[0]] },
    { ...valid, missingFields: ["unitQuantity"] },
    { ...valid, fields: [{ ...valid.fields[1], value: -1 }] },
    { ...valid, requiresHumanConfirmation: false },
    { ...valid, fields: [{ field: "cargoDescription", value: "  ", provenance: valid.fields[0].provenance }] },
    { ...valid, status: "REFUSED", refusalReason: "UNSUPPORTED_CONTENT" },
    { ...valid, fields: [{ ...valid.fields[0], provenance: { ...valid.fields[0].provenance, inputRevision: 6 } }] },
  ]) assert.equal(ModelProposalSchema.safeParse(output).success, false);
});

test("photo can suggest visible count but cannot establish mass or dimensions", async () => {
  const ids = missing.input.evidence.map(item => item.evidenceId);
  const positive = await proposeDeclaration(missing.input, scope(ids), { env, invoke: async () => reply(missing.proposal) });
  assert.equal(positive.ok, true);
  for (const field of ["unitWeightKg", "unitLengthCm", "unitWidthCm", "unitHeightCm"]) {
    const output = { ...missing.proposal, fields: [{ ...missing.proposal.fields[0], field, value: 100 }] };
    assert.equal(ModelProposalSchema.safeParse(output).success, false);
  }
  assert.equal(ModelProposalSchema.safeParse({ ...missing.proposal, warnings: [] }).success, false);
});

test("fabricated evidence, wrong source kind and excerpts absent from text are rejected", async () => {
  const first = proposal().fields[0];
  for (const provenance of [
    { ...first.provenance, quote: "not stated anywhere" },
    { ...first.provenance, source: "audio", evidenceId: "22222222-2222-4222-8222-222222222222" },
  ]) {
    const result = await proposeDeclaration(success.input, scope(), { env,
      invoke: async () => reply({ ...proposal(), fields: [{ ...first, provenance }] }),
    });
    assert.equal(errorCode(result), "MODEL_OUTPUT_INVALID");
    assert.equal(result.metadata.attempts, 2);
  }
  const ids = missing.input.evidence.map(item => item.evidenceId);
  const wrongKind = await proposeDeclaration(missing.input, scope(ids), {
    env, invoke: async () => reply({ ...missing.proposal,
      fields: [{ ...missing.proposal.fields[0], provenance: {
        ...missing.proposal.fields[0].provenance, source: "audio", basis: "EXPLICIT", quote: "3 pallets",
      } }],
    }),
  });
  assert.equal(errorCode(wrongKind), "MODEL_OUTPUT_INVALID");
});

test("authorization revoked during inference invalidates returned evidence", async () => {
  const context = scope(missing.input.evidence.map(item => item.evidenceId));
  const result = await proposeDeclaration(missing.input, context, {
    env, invoke: async () => {
      context.authorizedEvidenceIds = [];
      return reply(missing.proposal);
    },
  });
  assert.equal(errorCode(result), "MODEL_OUTPUT_INVALID");
});

test("PALLET cannot silently become BOX", async () => {
  const result = await proposeDeclaration(success.input, { ...scope(), expectedUnit: "BOX" },
    { env, invoke: async () => reply() });
  assert.equal(errorCode(result), "INCOMPATIBLE_UNIT");
  assert.equal(result.metadata.attempts, 1);
});

test("server scope is rechecked after inference; stale proposals cannot apply", async () => {
  const context = scope();
  const result = await proposeDeclaration(success.input, context, { env, invoke: async () => {
    context.currentInputRevision = 8;
    return reply();
  } });
  assert.equal(errorCode(result), "INPUT_REVISION_MISMATCH");
  const stale = await proposeDeclaration(success.input, scope(), {
    env, invoke: async () => reply({ ...proposal(), inputRevision: 6, fields: [] }),
  });
  assert.equal(errorCode(stale), "INPUT_REVISION_MISMATCH");
});

test("provider failures and diagnostics never include raw errors or private input", async () => {
  const events: ProposalTelemetry[] = [];
  const sensitive = "private-person-address-and-token";
  const result = await proposeDeclaration({ ...success.input, text: sensitive }, scope(), {
    env, onTelemetry: value => events.push(value),
    invoke: async () => { throw new Error(env.META_MODEL_API_KEY + sensitive); },
  });
  assert.equal(errorCode(result), unavailable.expectedError.code);
  assert.equal(result.metadata.attempts, 1);
  const output = JSON.stringify({ result, events });
  assert.doesNotMatch(output, /synthetic-key-do-not-log|private-person-address-and-token|stack|content|apiKey/);
});

test("a logging failure does not lose a valid proposal; unknown usage stays null", async () => {
  const result = await proposeDeclaration(success.input, scope(), {
    env, onTelemetry: () => { throw new Error("logger"); },
    invoke: async () => ({ ...reply(), usage: null }),
  });
  assert.equal(result.ok, true);
  assert.equal(result.metadata.inputTokens, null);
  assert.equal(result.metadata.outputTokens, null);
  let calls = 0;
  const retry = await proposeDeclaration(success.input, scope(), {
    env, invoke: async () => {
      if (++calls === 1) return reply(invalid.proposal);
      throw new Error("second attempt has no usage report");
    },
  });
  assert.equal(errorCode(retry), "PROVIDER_UNAVAILABLE");
  assert.equal(retry.metadata.inputTokens, null);
  assert.equal(retry.metadata.outputTokens, null);
});

test("deadline aborts a stalled provider with no unbounded retry", async () => {
  let signal: AbortSignal | undefined;
  const result = await proposeDeclaration(success.input, scope(), {
    env: { ...env, META_PROPOSAL_TIMEOUT_MS: "1000" },
    invoke: async request => { signal = request.signal; return new Promise(() => {}); },
  });
  assert.equal(errorCode(result), "PROVIDER_UNAVAILABLE");
  assert.equal(signal?.aborted, true);
  assert.equal(result.metadata.attempts, 1);
});

test("AX-00 runtime modules import no AWS, persistence or live transport client", () => {
  for (const file of ["config.ts", "schemas.ts", "proposal-boundary.ts"]) {
    const text = readFileSync(new URL(file, import.meta.url), "utf8");
    assert.doesNotMatch(text, /@aws-sdk|@supabase|fetch\(|new OpenAI|process\.env\.AWS/);
  }
});
