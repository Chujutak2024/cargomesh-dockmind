# CargoMesh DockMind

**Preparation candidate — not the final hackathon submission or an end-to-end DockMind demo.**

CargoMesh DockMind is being developed to compare what a shipper declares with what is observed during loading, then preserve evidence and human review in a shipment timeline. AI proposes; domain services validate; people confirm.

## What this candidate actually contains

| Component | Status in this snapshot |
| --- | --- |
| Existing CargoMesh web application, Hono APIs and V2 domain/database contracts | Reused baseline; built before this Meta increment |
| AX-00 declaration-proposal contract and validation | Included, credited to Axel with Codex |
| AX-01 Meta text adapter and reviewed chat integration | Included; explicit opt-in, injected-provider CI evidence available; real-provider acceptance pending |
| Confirmed/versioned declaration manifest and organization-document repository | Not included; implementation/integration pending |
| DockMind video worker, SAM inference and persistent job orchestration | Not included in this candidate; source work remains under review |
| Loading sessions, Tetris dashboard, reconciliation and Reality Passport | Not implemented by this candidate |
| Dedicated Meta deployment and judge demo URL | Not configured |

The name describes the project direction, not a claim that video analysis is already operational. Existing Amazon/Nova capabilities are inherited code, not new Meta work. No inherited demo URL is presented as a deployed version of this repository.

## Source and attribution

This candidate selects tracked files from integration commit `a5c2a4d8c0f4197641d9024f5f22908dd326e9d6` of the working repository. It does not include local uncommitted work or unmerged branches.

- [Provenance and contribution boundaries](PROVENANCE.md)
- [File-level release inventory](RELEASE_MANIFEST.json)
- [What was built during the hackathon](BUILT_DURING_HACKATHON.md)
- [MIT license](LICENSE) and [third-party notices](THIRD_PARTY_NOTICES.md)

Existing CargoMesh contributors retain attribution. Importing this snapshot does not transfer authorship or make earlier work new. Eligibility of pre-existing work and team composition remains a separate submission requirement; this repository does not certify it.

## Local setup

Use the inherited CI-pinned Node 24.20.0 and pnpm 11.19.0.

```sh
git clone https://github.com/Chujutak2024/cargomesh-dockmind.git
cd cargomesh-dockmind
pnpm --dir cargomesh install --frozen-lockfile
```

Copy `cargomesh/.env.example` to ignored `cargomesh/.env.local`. Supply your own isolated Supabase V2 configuration and provision an authorized synthetic test identity using the relevant scenario. Placeholder values are not usable credentials. Start the app with `pnpm --dir cargomesh dev`.

See [setup](docs/SETUP.md), [configuration](docs/CONFIGURATION.md), [scenario data](docs/DATA.md) and [testing](docs/TESTING.md). Those documents and `docs/v2-amazon/` include inherited history; they are not proof of a new Meta deployment or current legal/operational clearance. Do not point local reset/scenario commands at shared or production databases.

For the new text adapter, see [AX-01 configuration and limitations](docs/meta/AX01_META_TEXT.md) and [proposal contract](docs/meta/contracts/MODEL_PROPOSAL.md). Keep provider keys server-only. Real inference requires your own supported model/key and explicit opt-in; network calls can incur charges. Media/SAM cannot be enabled merely by changing the text provider setting.

## Verification and release status

The source AX-00/01 PR had successful automated CI with injected providers and inherited regressions. That evidence is recorded in [provenance](PROVENANCE.md); it is not a fresh test result for this exported candidate or real inference.

No local product tests, build, live model call, database mutation or visual review were executed when preparing this candidate, following the project owner's instruction. Future CI results must be assessed on this PR's exact SHA. Publication through this draft PR does not approve a final submission, merge, deployment or migration.
