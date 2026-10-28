# AX-00 — local implementation and validation

Date: 27 October 2026. Owner: Axel, assisted by Codex. Branch: codex/meta-axel; target: main in Chujutak2024/meta-hackathon.

This is the AX-00 snapshot at commit 94d0f05. Later integration changes and current acceptance are recorded in [AX-01](AX01_META_TEXT.md).

## Result

The versioned model_proposal boundary is implemented locally. It validates inputs, authorized evidence references, revisions and provider output; excludes commercial actions; enforces confirmation, limits and safe telemetry. Provider execution is injected. No live adapter, endpoint, UI integration or persistence is included.

## Reproducible checks

Working directory: cargomesh. Dependencies installed from the unchanged pnpm-lock.yaml using pnpm install --frozen-lockfile --ignore-scripts. Local Node 24.14.1, pnpm 10.33.0, TypeScript 5.9.3.

| Command | Actual result |
| --- | --- |
| pnpm test:meta-contract | Exit 0; 20 passed, 0 failed |
| pnpm test:v2-conversation | Exit 0; 106 + 32 passed, 0 failed |
| pnpm typecheck | Exit 0 |
| pnpm check:architecture | Exit 0; 777 modules and 236 client entry points checked |
| git diff --check | Exit 0 |
| Relative documentation links | All existing targets resolve |
| Comparison to meta-hackathon-start | Lockfile, inherited conversation, voice gateway and database sources unchanged |

The first typecheck found that Next's augmented ProcessEnv requires NODE_ENV even for an injected test dictionary. The configuration seam now accepts a readonly string/undefined map; process.env is compatible without loading any .env file. The corrected run passes.

Focused negative cases cover unknown business fields, no key/no invocation, unsafe base URL/models/limits, foreign or revoked evidence, bad source kinds/excerpts, stale input/output, incompatible units, appearance-only measurements, duplicate/conflicting fields, invalid JSON, schema retries, privacy and timeout cancellation.

The generated strict JSON Schema uses the same Zod structural source as server validation. Semantic cross-field/source checks run after parsing. All provider results in these tests are explicitly synthetic; no cloud credentials or live APIs were used.

## Files / consumers

- Shared DTO: cargomesh/src/shared/schemas/meta/model-proposal.ts.
- Server seam: cargomesh/src/server/ai/meta/{config,schemas,proposal-boundary}.ts.
- Test suite: proposal-boundary.test.ts.
- [Contract and fixtures](contracts/MODEL_PROPOSAL.md).
- Environment examples are server-only placeholders; legacy conversation modes remain unchanged.
- The inherited QA workflow now targets main in this repository and runs the focused suite. No workflow run or hosted gate is claimed.

## Remaining acceptance

- Cristhian/Juan contract review and authorized publication/integration.
- AX-01: real Meta SDK adapter with bounded retries, accurate model/usage evidence, META conversation mode and authenticated route integration.
- CR: declaration UI, authorized evidence resolution, manifest persistence and atomic human-confirmed apply.
- JU/RA: session, SAM/video, deterministic counts/reconciliation and Passport.
- AX-09: separate Meta hosting/database/provider setup; no project, key, billing, visibility or deployment change was made here.

No claim of a working Meta demo, audio generation, SAM tracking or end-to-end acceptance is made. Production build, database suites and unrelated business suites were not rerun for this isolated contract change. AX-00 remains pending human review/integration.
