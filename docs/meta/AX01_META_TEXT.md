# AX-01 — Meta text integration

27 October 2026. Owner: Axel, assisted by Codex. Local implementation on codex/meta-axel, continuing the AX-00 dependency; PR target remains main in Chujutak2024/meta-hackathon. Publication, human review and live acceptance remain pending.

## Implemented

- Server-only Meta Model API adapter using the existing SDK and https://api.meta.ai/v1. Model ID comes from META_MUSE_MODEL; tested serialization requests muse-spark-1.3.
- Strict JSON Schema in Chat Completions, reasoning_effort=low, bounded max_tokens, store=false and SDK retries disabled. SDK logging is explicitly off, including when OPENAI_LOG=debug.
- Text declaration uses the AX-00 proposal contract. A shared validator enforces source excerpts, evidence scope, inputRevision, unit compatibility and semantic rules. The AX-01 standalone adapter rejects media before transport.
- Existing authenticated conversation API supports META alongside BEDROCK/DETERMINISTIC. Member/origin checks remain in place. Existing loopback-only development preview stays disabled outside development. Both handlers allow 60 seconds; model work shares a maximum 45-second deadline.
- One model call per attempt returns guidance, quoted non-cargo facts and an optional AX-00 cargo proposal. At most one validation retry; provider outages/rate limits/auth failures return immediately. No automatic AWS or Baseten fallback.
- Structured mapping: unitType → packaging, unitWeightKg → unitWeightPerUnitKg, handlingRequirements → requirements. Quantities/dimensions remain per declared unit; domain code computes totals. Contact details stay on the existing local/manual path.
- The web chat recognizes META, displays setup/outage guidance, and retains the rules-based/manual path. A draft/scope snapshot and echoed inputRevision discard delayed responses after a manual edit or navigation.
- Explicit corrections and business commands keep their existing deterministic handling. This adapter cannot save, book, select, pay, create incidents or write to Supabase.

The application chooses the next form field. For PROVIDE/CORRECT, Meta's acknowledgment must not ask another question. HELP answers can ask one useful question and cannot propose fields. This avoids duplicate form questions.

## Configuration

Create cargomesh/.env.local locally (ignored by Git), using a **new Meta key**, never a copied Amazon environment:

```dotenv
CARGOMESH_AI_PROVIDER=META
META_MODEL_API_KEY=<your-private-meta-model-api-key>
META_MUSE_MODEL=muse-spark-1.3
# Optional, pinned to this Meta host by the adapter:
META_MODEL_BASE_URL=https://api.meta.ai/v1
META_PROPOSAL_TIMEOUT_MS=45000
META_PROPOSAL_MAX_OUTPUT_TOKENS=2048
```

CARGOMESH_AI_PROVIDER=DETERMINISTIC explicitly keeps processing local. BEDROCK retains its previous configuration/enable flag. With no selector, the inherited legacy behavior remains. An explicitly selected META with missing/invalid config produces NOT_CONFIGURED; it never silently invokes AWS.

Restart the local web process after configuration. No credential settings are exposed in the product UI. The API key must never be NEXT_PUBLIC_.

## Live check — not executed with a real key

Axel confirmed that no Meta key is available yet. Unit fixtures/mock HTTP responses are not live inference. This remaining acceptance cannot be inferred from a passing build or a successful SDK mock.

From cargomesh:

```powershell
pnpm smoke:meta-text --live
```

The opt-in command loads .env.local, checks configuration first, and sends one own synthetic declaration: 12 pallets of machine parts, 100 kg each. It validates the response contract and those values, missing dimensions, mode META and transport META_MODEL_API. It prints only status, model/request/usage metadata and whether the synthetic expectations matched. It does not print keys, raw input, reasoning, cookies or raw output, and performs no business writes.

Without --live, the command returns LIVE_OPT_IN_REQUIRED (exit 2). Without configuration, it returns NOT_CONFIGURED (exit 2), liveRequestMade=false. A configured unsuccessful acceptance returns exit 1. PASS/exit 0 is required before claiming real Meta text acceptance. Up to two validation attempts share the same deadline; real calls may incur provider charges.

## Local evidence

| Command | Result |
| --- | --- |
| pnpm test:meta-ai | 37 tests; synthetic/injected transport only |
| pnpm test:v2-conversation | 106 + 32 pass |
| pnpm test:v2-chat-workflow | 104 pass |
| pnpm typecheck | Pass |
| pnpm check:architecture | Pass; 782 modules / 236 client entry points |
| pnpm build | Pass locally, no hosting/deployment |
| Smoke without opt-in / with key intentionally absent | Both fail closed, exit 2; no live request |

The first build hit filesystem EPERM while creating generated .next output. Repeating the local build with sufficient filesystem access succeeded. No source or hosting workaround was needed.

## Limits and next acceptance

- No real model latency, cost, request ID or functional answer is claimed. Unpriced cost/unknown usage remain null. INJECTED marks tests; META_MODEL_API marks the default SDK transport, and attempts=0 does not prove a request.
- The response must report the configured exact model. Alias/version negotiation is not silently accepted.
- Context consists of the inherited bounded non-contact draft hints, current field, language and latest text; it is not full conversation history or verified business data. Only facts quoted from the latest turn are new proposals.
- inputRevision correlates the local unsaved draft/turn. It does not replace authentication, RLS or the existing expectedDraftVersion check on persistence.
- UI snapshots prevent a late proposal from applying over newer edits. The generic model acknowledgment remains generated text, not a source of commercial truth.
- CR must integrate declaration/media upload, evidence access and manifest confirmation/versioning; AX-02 adds actual media transport; JU/RA own loading/reconciliation/Passport. Speech synthesis and the Amazon Nova gateway are outside this cut.
- Human review and an authenticated UI session with the separately configured Meta backend remain pending. No new cloud project, IAM change, remote branch push, merge or deployment was performed.

## Official references checked

- [Structured output](https://dev.meta.ai/docs/structured-output)
- [Reasoning parameter and output budget](https://dev.meta.ai/docs/reasoning)
- [Model identifiers](https://dev.meta.ai/docs/models)

## Publication synchronization, 27 October 2026

The existing shared branch at 3e24965 was retained. Original unpublished AI commits were reapplied as 3d1c8fe (AX-00) and 93d34c6 (AX-01), with the active target main of meta-hackathon. Remote AGENTS, prompts, backlog, SQL and unrelated application work were preserved.

After synchronization: 37 Meta tests, 106 + 32 conversation tests, 104 workflow tests, typecheck and architecture all pass. The transplanted application code matches the previously tested local implementation, ignoring line endings. The local production build result above predates synchronization; a second production build was not run for the document-only conflict resolutions. No live provider call or deployment was made.
