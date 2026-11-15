# Testing strategy

How this monorepo proves correctness. The web client talks to devices through
the Kotlin meshtastic-sdk (`packages/sdk-kmp`), so protocol and persistence
behaviour is tested upstream in that SDK; this repo tests the facade and the UI.

## Levels

Each PR should add coverage at the **lowest level that catches the regression**, and only climb tiers when that's not possible.

| Tier | Scope | Tooling | Where |
| --- | --- | --- | --- |
| 1. **Unit** | Pure functions, stores, single classes with mocked deps | `vitest run` (Node env) | `*.test.ts` colocated with source |
| 2. **Facade** | The `@JsExport` facade and browser transports in `packages/sdk-kmp` | `vitest` | `packages/sdk-kmp` (`pnpm --filter @meshtastic/sdk-kmp test`) |
| 3. **Component / DOM** | React components and hooks, with the SDK facade mocked | `vitest` + `@testing-library/react` + `jsdom` | `apps/web/src/**` |
| 4. **E2E** | Whole web client in a real browser | Playwright | `e2e/` |

## Per-package notes

| Package | Notes |
| --- | --- |
| `apps/web` | Component and store tests; new SDK-driven UI must mock the facade rather than the Kotlin build. |
| `packages/sdk-kmp` | Facade tests only; the underlying Kotlin SDK is tested in its own repository. |
| `packages/ui` | Pure presentational; no unit tests. |
| `packages/protobufs` | Generated code; upstream's responsibility. |

## Conventions

- Test file colocated with source: `Foo.ts` -> `Foo.test.ts`.
- Each test imports concrete classes from the source path (`./Foo.ts`), not the package barrel.

## Running

```sh
pnpm test                          # root vitest, all projects
pnpm --filter meshtastic-web test  # web client only
pnpm --filter @meshtastic/sdk-kmp test
pnpm test:e2e                      # Playwright
```
