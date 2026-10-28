# CargoMesh DockMind — public release candidate

This repository publishes reviewed candidates from the private development repository. Read README.md, PROVENANCE.md and RELEASE_MANIFEST.json before making changes. It is not a mirror or a second independent implementation.

- Preserve real authorship, MIT/third-party notices and source SHAs. An export or new commit does not make inherited code new work or remove contributors.
- State implementation and verification limits accurately. This initial candidate contains the existing baseline and AX-00/AX-01 text work; it does not implement a final DockMind demo.
- Keep the existing application at `cargomesh/`, active migrations at `supabase-v2/supabase/migrations/` and historical SQL/regression scenarios clearly separated.
- Use `codex/*` branches and a reviewed PR to this repository's main. No direct push to main, force-push or rewriting shared history. Main merge/final publication requires the project owner's authorization.
- Do not copy the entire private tree or Git history. Each promotion needs a file/commit inventory, dependencies and real contribution review. Do not publish secrets, local environments, personal documents or private videos.
- No deployment, hosted migration, collaborator/visibility change or Amazon modification without specific authorization. Source test credentials, where present, are synthetic local fixtures, not production configuration.
- Retain actor/tenant checks, RLS, canonical idempotency and expected-version guards. AI proposes; domain code validates; people confirm. No inferred coverage, capacity, prices, official documents or commercial authorization.
- Respect the owner's instruction: do not execute additional product tests or visual checks unless subsequently authorized. Record what was actually run; inherited/source CI is not this candidate's acceptance.
- Fix producer defects in the source owner's branch, then promote an identified reviewed increment. A publication PR does not complete unfinished source work.
