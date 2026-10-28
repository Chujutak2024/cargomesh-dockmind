# Meta friction log

## 2026-10-27 — inherited authority and repository split

The copied AGENTS, root docs and workflow targeted Amazon main. The user requested a separate repository while the Amazon submission remains under review. Active instructions/docs and CI target meta-main in meta-hackathon; Amazon source/services remain untouched. Previous product docs remain identified as inherited. No cloud project or deployment link was copied.

## 2026-10-27 — SDK JSON Schema conversion

The installed openai 7.30.0 helper rejected Zod trim transformations in model-output schemas because transformations are not representable in strict JSON Schema. Output now uses structural constraints plus explicit semantic nonblank checks. The generated provider schema and server validation share the same structural source. No dependency version change was required.

## Runtime verification boundary

Local host: Node 24.14.1 and pnpm 10.33.0; package requires Node >=22. Inherited CI pins 24.20.0/11.19.0. Dependencies were installed from the unchanged lockfile with lifecycle scripts disabled. This is enough for focused TS tests, not a certification of a production build or all inherited CI jobs.

## 2026-10-27 — AX-01 live acceptance and local build

Axel confirmed no Meta Model API key is available. The SDK adapter is tested with injected HTTP and the smoke command fails closed without config; no fixture is presented as a real model response. Live text acceptance remains pending.

The production build initially hit EPERM creating generated .next directories under local execution restrictions. A repeat with sufficient filesystem access compiled successfully. AX-01 now has a passing local build, but no hosted gate or deployment is claimed.

## 2026-10-27 — rama remota existente al publicar

La publicación encontró codex/meta-axel ya creada sobre la estructura del equipo, cuyo target aceptado es main de este repositorio. Se conservó esa historia y se reaplicaron solo los commits locales inéditos de IA. Los conflictos fueron documentales: prevalecen AGENTS, prompts, backlog y estructura remotos; las referencias antiguas a meta-main describen preparación local, no el flujo activo. No hubo force-push ni cambios en main/Amazon.
