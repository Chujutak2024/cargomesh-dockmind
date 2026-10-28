# AX-00 — model_proposal v1.0

Status: implemented locally; Cristhian/Juan review pending. No inference or persistence is certified by this contract.

## Boundary

An authenticated application service resolves evidence access and the current draft revision before calling proposeDeclaration. AX-00 accepts only text and evidence references with optional server-resolved OCR/transcripts. It does not fetch files, authenticate users, expose an endpoint, upload media, call an API or apply edits.

Shared Zod DTOs: cargomesh/src/shared/schemas/meta/model-proposal.ts. Server-only boundary/config/schema generation: cargomesh/src/server/ai/meta. Relative paths in this document are repository paths.

The provider response format is generated from ModelProposalShapeSchema through the installed SDK helper. ModelProposalSchema then enforces semantic guards. JSON Schema compliance cannot prove the truth of model-generated values. Text normalization is confined to input; output checks do not silently transform values. See [Meta structured output](https://dev.meta.ai/docs/structured-output).

The portable [JSON Schema](model-proposal.schema.json) is exported from that format; the contract test checks parity. Python/worker consumers can use it for structural validation but must preserve the documented semantic and authorization checks.

## Input

All keys are required; use null for absent text. Unknown keys are rejected.

| Key | Contract |
| --- | --- |
| schemaVersion | 1.0 |
| inputRevision | Integer >=0, equal to the server's current revision |
| language | en or es |
| text | Nonblank string <=6,000 characters, or null |
| evidence | Up to 4 unique UUID references: evidenceId, kind photo/label/audio, text <=6,000 characters or null |

At least text or evidence is required. Combined input text is capped at 12,000 characters. Evidence carries no signed URL, storage path, organization ID or credential. The caller must resolve its organization and authorized IDs from the existing authenticated boundary, never from the model/browser.

ProposalScope is trusted server context: currentInputRevision, authorizedEvidenceIds, expectedUnit PALLET/BOX/null. It is not a client DTO or a replacement for RLS. Scope is checked before inference and again on returned proposals. Consumers must also compare the revision atomically when applying a human-confirmed edit; this function alone cannot prevent a later race.

## Output

Model output contains schemaVersion, inputRevision, status PROPOSED/REFUSED, refusalReason, fields, missingFields, warnings and requiresHumanConfirmation=true. Unknown keys at any level fail validation.

| Allowed field | Value / meaning |
| --- | --- |
| cargoDescription | Nonblank string <=500 |
| unitType | PALLET or BOX; never convert between them silently |
| unitQuantity | Positive integer <=1,000,000 |
| unitWeightKg | Positive finite kg **per declared unit**, <=1,000,000 |
| unitLengthCm / unitWidthCm / unitHeightCm | Positive finite centimeters per unit, <=100,000 |
| handlingRequirements | 1–12 nonblank strings, each <=120 |

Fields are unique and cannot simultaneously be in missingFields. Absent measurements remain missing, not zero. Total weight/volume calculations belong to domain code. Mapping unitWeightKg to the inherited unitWeightPerUnitKg is an explicit AX-01/CR integration responsibility. PALLET containing 12 boxes remains one PALLET, not 13 units.

Every field carries provenance: source text/photo/label/audio, evidenceId (null only for text), inputRevision, basis EXPLICIT/VISIBLE and quote (null for photo).

- Text, label and audio require an explicit excerpt. For text or supplied transcript/OCR, the excerpt must occur in the input. This checks attribution, not the numerical interpretation or factual truth.
- An excerpt attributed to label/audio without supplied text is provisional; the future media adapter must actually send/resolve that evidence. AX-00 does not inspect a file.
- A plain photo can propose visible description, unit type or count, but cannot establish weight, dimensions or handling requirements. NO_SCALE is required; counts also require VISIBLE_COUNT_ONLY. A visible count is not a complete load census.
- Label proposals require UNVERIFIED_LABEL. A readable mass/dimension label or a user's explicit text/audio declaration may propose those values. No appearance-based measurement is accepted.
- Evidence must be both in this input and authorized, with matching kind. A reference from another proposal or tenant is not acceptable.
- A refusal has reason UNSUPPORTED_CONTENT or NOT_A_CARGO_DECLARATION and no fields. It is a valid non-action result, not an outage.

No price, booking, selection, incident, persistence command, tenant identity or approved state is allowed. A proposal never saves itself.

## Provider seam and configuration

proposeDeclaration requires an injected InvokeProposal; the core boundary has no default transport. AX-01 now supplies a Meta SDK adapter and conversation wrapper, documented in [AX-01](../AX01_META_TEXT.md). Metadata distinguishes INJECTED from META_MODEL_API; a transport label alone is not proof of a successful live request. The inherited BEDROCK/DETERMINISTIC paths are retained.

Invoke receives validated input, private config, responseFormat, AbortSignal and attempt. It returns content (JSON string <=32,768 characters), requestId (safe identifier or null), model, usage (inputTokens/outputTokens or null). The returned model must match the configured requested model; alias/version negotiation requires a later explicit adapter contract.

Configuration requires CARGOMESH_AI_PROVIDER=META, META_MODEL_API_KEY and META_MUSE_MODEL. Default base URL is https://api.meta.ai/v1; other hosts/protocols/paths fail closed to avoid routing a Meta key to another provider. Contributor and Muse Image variants are not accepted.

Defaults: total deadline 45,000 ms, 2,048 output tokens per attempt. Allowed deadline 1,000–45,000 ms; tokens 256–4,096. At most two attempts **in total**, sharing one deadline. Invalid output gets one retry. Transport failure/timeout stops immediately and permits a later manual retry. The future SDK must use maxRetries=0 so SDK retries do not multiply the boundary budget. No automatic provider fallback.

Metadata is constructed by the server: provider META, transport INJECTED, model, requestId, total latency, attempts, input/output token totals, outcome. Missing usage and unpriced cost remain null, never zero. An injected fixture's provider field identifies the intended contract, not proof of live Meta execution. Only metadata can reach onTelemetry; input, raw replies, raw exceptions and credentials are excluded.

## Stable errors

| Code | AX-00 trigger | Automatic retry |
| --- | --- | --- |
| VALIDATION_ERROR | Invalid client/service DTO | None |
| FORBIDDEN_TENANT | Input evidence absent from server allowlist | None |
| INPUT_REVISION_MISMATCH | Input/proposal/server revision changed | None; renew context |
| NOT_CONFIGURED | Disabled/missing/invalid Meta configuration | None; transport is never invoked |
| MODEL_OUTPUT_INVALID | Invalid JSON/schema/provenance/model | One, then return error |
| INCOMPATIBLE_UNIT | Proposal contradicts known server unit | None; ask user |
| PROVIDER_UNAVAILABLE | Transport failure or total deadline | None; retryable=true |

MEDIA_INVALID, SESSION_SCOPE_INCOMPLETE, OBSERVATION_INSUFFICIENT are reserved shared codes for subsequent owner contracts; AX-00 does not claim to implement media or reconciliation.

The DTO contains code and retryable, not raw provider errors. An HTTP adapter must map these into the existing API envelope, authentication and stable statuses. No new route exists yet.

## Fixtures and verification

[Success](fixtures/success.json), [missing measurements](fixtures/missing.json), [refusal](fixtures/refusal.json), [unavailability](fixtures/unavailable.json) and [invalid commercial field](fixtures/invalid.json) are explicitly SYNTHETIC_NO_INFERENCE. They contain no real user records or credentials.

Run pnpm test:meta-contract from cargomesh, then the inherited conversation regressions, typecheck and architecture gate. Real API acceptance is separate. See [recorded results](../AX00_VALIDATION.md).
