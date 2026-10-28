import assert from "node:assert/strict";
import test from "node:test";
import { interpretMetaDeclaration } from "./interpret-declaration";
import { interpretConversationTurn, conversationBedrockConfig } from "@/server/conversation/interpret";
import { InterpretationResponseSchema } from "@/features/v2-conversation-prep/interpretation";
import { providerStatus, interpretationStillCurrent } from "@/features/v2-conversation-prep/provider-status";
import fixture from "../../../../../docs/meta/contracts/fixtures/success.json";

const env = {
  CARGOMESH_AI_PROVIDER: "META", META_MODEL_API_KEY: "unit-test-key-not-real",
  META_MUSE_MODEL: "muse-spark-1.3",
};
const input = {
  schemaVersion: "2.0" as const, text: fixture.input.text, currentField: "unitQuantity" as const,
  language: "en" as const, inputRevision: 7,
};
const turn = () => ({
  intent: "PROVIDE", fields: [], acknowledgment: "I noted the declared quantity, packaging and weight for review.",
  declaration: structuredClone(fixture.proposal),
});
type Seen = { url: string; body: Record<string, unknown>; authorization: string | null };
function transport(outputs: unknown[], options: { status?: number; finishReason?: string; model?: string } = {}) {
  const seen: Seen[] = [];
  const fetch: typeof globalThis.fetch = async (url, init) => {
    const body = JSON.parse(String(init?.body));
    seen.push({ url: String(url), body, authorization: new Headers(init?.headers).get("authorization") });
    const output = outputs[Math.min(seen.length - 1, outputs.length - 1)];
    if (options.status) return new Response(JSON.stringify({ error: { message: "private provider detail" } }),
      { status: options.status, headers: { "content-type": "application/json" } });
    return new Response(JSON.stringify({
      id: "chatcmpl-test", object: "chat.completion", created: 1,
      model: options.model ?? "muse-spark-1.3",
      choices: [{ index: 0, finish_reason: options.finishReason ?? "stop",
        message: { role: "assistant", content: typeof output === "string" ? output : JSON.stringify(output) } }],
      usage: { prompt_tokens: 120, completion_tokens: 80, total_tokens: 200 },
    }), { status: 200, headers: { "content-type": "application/json", "x-request-id": "meta-unit-request" } });
  };
  return { seen, fetch };
}

test("real SDK transport uses Meta JSON Schema, low reasoning and server-only key", async () => {
  const mock = transport([fixture.proposal]);
  const result = await interpretMetaDeclaration(fixture.input,
    { currentInputRevision: 7, authorizedEvidenceIds: [], expectedUnit: "PALLET" },
    { env, fetch: mock.fetch });
  assert.equal(result.ok, true);
  assert.equal(mock.seen.length, 1);
  const request = mock.seen[0];
  assert.equal(request.url, "https://api.meta.ai/v1/chat/completions");
  assert.equal(request.authorization, "Bearer unit-test-key-not-real");
  assert.equal(request.body.model, "muse-spark-1.3");
  assert.equal(request.body.reasoning_effort, "low");
  assert.equal(request.body.max_tokens, 2048);
  assert.equal(request.body.store, false);
  assert.equal((request.body.response_format as { type: string }).type, "json_schema");
  assert.equal(request.body.tools, undefined);
  assert.equal(result.metadata.requestId, "meta-unit-request");
  assert.equal(result.metadata.transport, "INJECTED");
  assert.doesNotMatch(JSON.stringify(result), /unit-test-key-not-real|authorization/);
});

test("text-only adapter rejects media before transport and cannot route a key elsewhere", async () => {
  let calls = 0;
  const fetch: typeof globalThis.fetch = async () => { calls++; throw new Error("must not invoke"); };
  const media = { ...fixture.input, evidence: [{ evidenceId: "11111111-1111-4111-8111-111111111111", kind: "photo", text: null }] };
  const blocked = await interpretMetaDeclaration(media, {
    currentInputRevision: 7, authorizedEvidenceIds: [media.evidence[0].evidenceId], expectedUnit: null,
  }, { env, fetch });
  assert.equal(blocked.ok, false);
  if (!blocked.ok) assert.equal(blocked.error.code, "MEDIA_INVALID");
  const missing = await interpretMetaDeclaration(fixture.input,
    { currentInputRevision: 7, authorizedEvidenceIds: [], expectedUnit: null },
    { env: { ...env, META_MODEL_BASE_URL: "https://other.example/v1" }, fetch });
  assert.equal(missing.ok, false);
  assert.equal(calls, 0);
});

test("SDK debug environment cannot enable prompt, key or raw-response logging", async () => {
  const previous = process.env.OPENAI_LOG;
  const methods = ["debug", "info", "warn", "error", "log"] as const;
  const saved = methods.map(method => console[method]);
  const captured: unknown[][] = [];
  const mock = transport([fixture.proposal]);
  let result;
  try {
    process.env.OPENAI_LOG = "debug";
    for (const method of methods) console[method] = (...args: unknown[]) => { captured.push(args); };
    result = await interpretMetaDeclaration(fixture.input,
      { currentInputRevision: 7, authorizedEvidenceIds: [], expectedUnit: null }, { env, fetch: mock.fetch });
  } finally {
    methods.forEach((method, index) => { console[method] = saved[index]; });
    if (previous === undefined) delete process.env.OPENAI_LOG; else process.env.OPENAI_LOG = previous;
  }
  assert.equal(result?.ok, true);
  assert.equal(captured.length, 0);
});

test("Meta chat maps AX-00 proposal to existing fields without executing or losing context", async () => {
  const mock = transport([turn()]);
  const request = { ...input, context: {
    knownFields: [{ field: "originFacilityId" as const, value: "Lima" }],
    lastAskedField: "unitQuantity" as const, failedAttempts: 0,
  } };
  const result = await interpretConversationTurn(request, { env, metaFetch: mock.fetch });
  const parsed = InterpretationResponseSchema.parse(result);
  assert.equal(parsed.mode, "META");
  assert.equal(parsed.inputRevision, 7);
  assert.ok(parsed.interpretation.fields.some(field => field.field === "packaging" && field.value === "PALLET"));
  assert.ok(parsed.interpretation.fields.some(field => field.field === "unitWeightPerUnitKg" && field.value === "100"));
  assert.equal(parsed.interpretation.fields.some(field => field.field === "originFacilityId"), false);
  assert.equal(parsed.declarationProposal?.fields.length, 4);
  assert.ok(parsed.declarationProposal?.missingFields.includes("unitLengthCm"));
  const payload = JSON.parse((mock.seen[0].body.messages as { content: string }[])[1].content);
  assert.equal(payload.context.knownFields[0].value, "Lima");
  assert.equal(mock.seen.length, 1);
});

test("Meta guidance answers in the requested language without changing a draft", async () => {
  const mock = transport([{ intent: "HELP", fields: [], declaration: null,
    acknowledgment: "Un pallet es una plataforma para agrupar carga. ¿Qué producto transportarás?" }]);
  const result = await interpretConversationTurn({ ...input, text: "¿Qué es un pallet?", language: "es" },
    { env, metaFetch: mock.fetch });
  assert.equal(result.mode, "META");
  assert.deepEqual(result.interpretation.fields, []);
  assert.match(result.interpretation.acknowledgment ?? "", /plataforma/);
});

test("non-cargo facts require a quote from the latest turn, never old context", async () => {
  const mock = transport([{
    intent: "PROVIDE", fields: [{ field: "originFacilityId", value: "Lima", quote: "old context" }],
    acknowledgment: "Where should it go?", declaration: null,
  }]);
  const result = await interpretConversationTurn({ ...input, text: "Actually, where do I start?" },
    { env, metaFetch: mock.fetch });
  assert.equal(result.mode, "DETERMINISTIC");
  assert.equal("providerError" in result && result.providerError?.code, "MODEL_OUTPUT_INVALID");
  assert.equal(mock.seen.length, 2);
});

test("invalid output retries once and cannot emit booking intent, tools or extra fields", async () => {
  for (const invalid of [{ ...turn(), intent: "BOOKING" }, { ...turn(), createBooking: true }, "{broken",
    { ...turn(), acknowledgment: "What are the dimensions?" },
    { ...turn(), fields: [{ field: "unitQuantity", value: "900", quote: "12 pallets" }] }]) {
    const mock = transport([invalid]);
    const result = await interpretConversationTurn(input, { env, metaFetch: mock.fetch });
    assert.equal(result.mode, "DETERMINISTIC");
    assert.equal("providerError" in result && result.providerError?.code, "MODEL_OUTPUT_INVALID");
    assert.equal(mock.seen.length, 2);
  }
});

test("bad first response can be repaired once within one request budget", async () => {
  const mock = transport(["bad JSON", turn()]);
  const result = await interpretConversationTurn(input, { env, metaFetch: mock.fetch });
  assert.equal(result.mode, "META");
  assert.equal("providerMetadata" in result && result.providerMetadata?.attempts, 2);
  assert.equal("providerMetadata" in result && result.providerMetadata?.inputTokens, 240);
});

test("missing key stays visibly unconfigured and never falls back to AWS", async () => {
  let calls = 0;
  const result = await interpretConversationTurn(input, {
    env: { ...env, META_MODEL_API_KEY: "", CARGOMESH_BEDROCK_CONVERSATION_ENABLED: "true" },
    metaFetch: async () => { calls++; throw new Error("must not call"); },
    invoke: async () => { throw new Error("AWS must not be invoked"); },
  });
  assert.equal(result.mode, "DETERMINISTIC");
  assert.equal("providerError" in result && result.providerError?.code, "NOT_CONFIGURED");
  assert.equal(calls, 0);
  assert.match(providerStatus("DETERMINISTIC", { code: "NOT_CONFIGURED", retryable: false }, "en")!, /not connected/);
});

test("429/auth/network failures have no SDK retry storm or private errors in response", async () => {
  for (const status of [401, 429, 500]) {
    const mock = transport([], { status });
    const result = await interpretConversationTurn(input, { env, metaFetch: mock.fetch });
    assert.equal(result.mode, "DETERMINISTIC");
    assert.equal("providerError" in result && result.providerError?.code, "PROVIDER_UNAVAILABLE");
    assert.equal(mock.seen.length, 1);
    assert.doesNotMatch(JSON.stringify(result), /private provider detail|unit-test-key-not-real/);
  }
});

test("a stalled SDK transport is aborted by the shared total deadline", async () => {
  let aborted = false;
  let calls = 0;
  const fetch: typeof globalThis.fetch = async (_, init) => {
    calls++;
    return new Promise((_, reject) => {
      init?.signal?.addEventListener("abort", () => {
        aborted = true;
        reject(new Error("private abort detail"));
      }, { once: true });
    });
  };
  const result = await interpretConversationTurn(input, {
    env: { ...env, META_PROPOSAL_TIMEOUT_MS: "1000" }, metaFetch: fetch,
  });
  assert.equal("providerError" in result && result.providerError?.code, "PROVIDER_UNAVAILABLE");
  assert.equal(calls, 1);
  assert.equal(aborted, true);
});

test("truncated or wrong-model output cannot be treated as a valid response", async () => {
  for (const options of [{ finishReason: "length" }, { model: "different-model" }]) {
    const mock = transport([turn()], options);
    const result = await interpretConversationTurn(input, { env, metaFetch: mock.fetch });
    assert.equal("providerError" in result && result.providerError?.code, "MODEL_OUTPUT_INVALID");
    assert.equal(mock.seen.length, 2);
  }
});

test("stale declaration revision and invented sources are rejected", async () => {
  const stale = turn();
  stale.declaration.inputRevision = 6;
  stale.declaration.fields = [];
  const mock = transport([stale]);
  const result = await interpretConversationTurn(input, { env, metaFetch: mock.fetch });
  assert.equal("providerError" in result && result.providerError?.code, "INPUT_REVISION_MISMATCH");
  assert.equal(mock.seen.length, 1);
  const foreign = turn();
  foreign.declaration.fields[0].provenance.quote = "invented source";
  const bad = transport([foreign]);
  const rejected = await interpretConversationTurn(input, { env, metaFetch: bad.fetch });
  assert.equal("providerError" in rejected && rejected.providerError?.code, "MODEL_OUTPUT_INVALID");
});

test("explicit corrections and business requests bypass the model", async () => {
  for (const text of ["change quantity to 12", "book this shipment", "save draft", "check ROAD for my saved request"]) {
    let calls = 0;
    const result = await interpretConversationTurn({ ...input, text }, {
      env, metaFetch: async () => { calls++; throw new Error("no model action"); },
    });
    assert.equal(result.mode, "DETERMINISTIC");
    assert.equal(calls, 0);
  }
});

test("explicit deterministic selector overrides a configured legacy provider", async () => {
  const config = conversationBedrockConfig({
    CARGOMESH_BEDROCK_CONVERSATION_ENABLED: "true",
    CARGOMESH_BEDROCK_REGION: "us-east-1", CARGOMESH_BEDROCK_MODEL_ID: "legacy",
  });
  const result = await interpretConversationTurn(input, { config, env: { CARGOMESH_AI_PROVIDER: "DETERMINISTIC" },
    invoke: async () => { throw new Error("must not call"); },
  });
  assert.equal(result.mode, "DETERMINISTIC");
});

test("late response guard preserves manual edits, scope changes and newer revisions", () => {
  const started = { draft: "quantity=10", scope: "request-A", revision: 7 };
  assert.equal(interpretationStillCurrent(started, started, 7), true);
  assert.equal(interpretationStillCurrent(started, { ...started, draft: "quantity=12" }, 7), false);
  assert.equal(interpretationStillCurrent(started, { ...started, scope: "request-B" }, 7), false);
  assert.equal(interpretationStillCurrent(started, started, 6), false);
  assert.equal(interpretationStillCurrent(started, { ...started, revision: 8 }, 7), false);
  assert.equal(interpretationStillCurrent(started, started, undefined), true);
});

test("Meta response contract requires honest provider metadata and revision", () => {
  const parsed = InterpretationResponseSchema.safeParse({
    schemaVersion: "2.0", interpretation: { intent: "HELP", fields: [] }, mode: "META", telemetry: null,
  });
  assert.equal(parsed.success, false);
});
