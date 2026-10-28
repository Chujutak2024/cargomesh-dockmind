# Source, attribution and release boundaries

Prepared on 27 October 2026 (America/Lima). This document describes an interim technical candidate, not an assertion that the project is ready or eligible for submission.

## Existing baseline

The existing application, Hono domain API, V2 SQL, regression fixtures, tests and inherited assets originate from [CargoMesh commit 4482d3a9a51bcc8c7c151996862ac5d43c96db8f](https://github.com/Chujutak2024/cargomesh/commit/4482d3a9a51bcc8c7c151996862ac5d43c96db8f). That work predates the Meta increment. Its history and attribution remain at the original repository; this export does not claim that the publishing account authored the imported code.

The MIT license and third-party notices are retained verbatim. Historical V1 SQL is regression material, not the V2 runtime chain. Synthetic scenario data is not live carrier coverage or operational evidence. Existing media/assets are inherited materials, not new DockMind captures or evidence of real inference; final demo material still needs an applicable rights review.

The general CargoMesh team includes Cristhian, Juan, Axel, Ramón/Jean and Luis; this list does not replace the original repository's contribution history. A public import must not erase credit for prior contributions, including Luis's. New work actually contributed by a person cannot be made eligible by copying files, changing who pushes, changing commit metadata or moving to another repository.

## Integrated source snapshot

Working repository: `https://github.com/Chujutak2024/meta-hackathon` (private).

Selected source: `a5c2a4d8c0f4197641d9024f5f22908dd326e9d6`, the integration of source PR #4 into main. The public file inventory records Git blob IDs and SHA-256 digests so the selection can be traced without publishing the private repository's entire Git history.

| Included change | Actual contribution / origin | Source reference |
| --- | --- | --- |
| AX-00 proposal schema, provenance/revision guards and fixtures | Axel directing Codex; source Git author Axel-botAfk | 3d1c8fec5f8474aa99825611e72f04017f463b93 |
| AX-01 text SDK adapter, chat integration, diagnostics and injected tests | Axel directing Codex; source Git author Axel-botAfk | 93d34c6602b51f6ae64f09f1ac74dbaab5d6bf75 |
| Branch/source documentation and synchronization | Axel-botAfk | fe78b1552ad51a10d7876ec1015a8291ee4e98e1; 74bfe467758000de30bc80a70c956d91c02c07c9 |
| Shared workspace scaffolding | Cristhian with Codex; preparation only | 72669d4 / dac50b3 and source tree |
| Integration and this public packaging | Cristhian with Codex | Source merge a5c2a4d; release PR/commit identifies the export |

There is no claim of new video counting, ASR, manifest persistence, loading sessions or Passport implementation in this candidate. Blank module directories/README plans do not implement them. Luis's unmerged new voice/explanation/environment front is not included; this is not a claim that the general product has only four contributors.

## Selection and overlays

The selected source paths comprise the application (`cargomesh/`), supporting scripts, both clearly distinguished SQL/regression trees, technical baseline documentation, AX-00/01 contract/evidence documentation, license/notices and inherited CI. Team-only prompts, planning backlog, pasted references, local `.env` files, local build output, Git metadata and unmerged/uncommitted work are not exported.

Release-specific overlays replace the repository landing page, agent/contribution guidance, documentation entry points and CI templates to point to this public candidate. `docs/SETUP.md` uses this repository's clone URL. These are packaging changes, not a new implementation of the source features. `RELEASE_MANIFEST.json` enumerates imported files and distinguishes imported bytes from packaging overlays.

## Evidence and limitations

Source PR #4 was reviewed at head `74bfe467758000de30bc80a70c956d91c02c07c9` against base `6f70f50dbaf235ea68a458797af92487c02f2e37`. Source Actions run `40481170068` reported success for the application gate (including injected Meta tests), V2 clean bootstrap/drift/pgTAP, and V1 historical replay. The original local test claims in AX documentation are retained as historical evidence; they were not reproduced while packaging this export.

Candidate checks performed here are file-selection/hash checks and a bounded static scan for credential patterns. They do not establish a complete security audit, build success, model performance, workflow correctness or rights clearance. No new local product tests, live API calls, SQL commands or visual review were performed. Automatic CI, if triggered, must be read independently on the exact candidate SHA; no result is predeclared.

Pending before a final release: functional module integration, review/fixes, verification when authorized, supported live-provider acceptance, own loading-video evidence, rights review of displayed media, final scope/eligibility assessment, setup instructions validated for that scope and an approved dedicated deployment/SHA. Moving files here does not itself resolve the event's team-size or prior-work rules.
