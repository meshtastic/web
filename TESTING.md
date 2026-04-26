# Testing strategy

How this monorepo proves correctness, and where coverage currently sits.

## Levels

Tests live in five tiers. Each PR should add coverage at the **lowest level that catches the regression**, and only climb tiers when that's not possible.

| Tier | Scope | Tooling | Where |
| --- | --- | --- | --- |
| 1. **Unit** | Pure functions, value objects, mappers, single classes with mocked deps | `vitest run` (Node env) | `*.test.ts` colocated with source |
| 2. **Slice integration** | Use-case + store + mapper exercised against in-memory deps; assert outbound bytes and signal state | `vitest` + `createFakeTransport()` | `*.test.ts` in slice dirs |
| 3. **Client integration** | `MeshClient` end-to-end with a fake transport feeding canned `FromRadio` packets | `vitest` + `@meshtastic/sdk/testing` | `packages/sdk/tests/integration/` |
| 4. **Storage integration** | Real Drizzle queries against sql.js in-memory; or against `@vitest/browser` for OPFS | `vitest` (Node + browser) | `packages/sdk-storage-sqlocal/{src,tests}` |
| 5. **Hook / DOM** | React hooks render under `<MeshProvider>` / `<MeshRegistryProvider>`, react to signals | `vitest` + `@testing-library/react` + `jsdom` | `packages/sdk-react/tests/` |
| 6. **E2E / simulator** | Whole stack: SDK → transport → simulator/firmware. Catches protocol drift | `@vitest/browser` for OPFS; `meshtasticd` simulator over TCP for protocol | future `tests/e2e/` |

## Per-package coverage gates

| Package | Required floor | Notes |
| --- | --- | --- |
| `packages/sdk/core` | every primitive (signals, EventBus, Queue, packet-codec, identifiers) has a unit test; lifecycle covered by `MeshClient.test.ts` | adopt `c8` thresholds once stable |
| `packages/sdk/features/*`  | each slice ships: 1 domain invariant test, 1 use-case test against fake transport, 1 mapper round-trip (where mappers exist) | Integration covered by `tests/integration/fake-transport.test.ts` |
| `packages/sdk-react` | each public hook has a `renderHook` test that asserts initial render + re-render on signal change | uses jsdom; provider wrapper required |
| `packages/sdk-storage-sqlocal` | every repository method tested against sql.js in-memory; **at least one OPFS-real test per repo** runs in browser mode | sql.js validates SQL correctness; OPFS validates VFS / Worker plumbing |
| `packages/transport-*` | minimum: framing round-trip, disconnect cleans up streams, error path emits status | low-level; ship as is |
| `packages/web` | component tests at `34` baseline; new SDK-driven UI components must add a hook-mock test | currently all green |

## Current state (audit)

| Package | Test files | Tests pass | Gaps |
| --- | --- | --- | --- |
| `packages/sdk` | 7 | 25 ✅ | nodes/channels/config/telemetry/position/traceroute/files slices have **no tests**; no `MeshClient` lifecycle test (only fake-transport integration); no schema migration test |
| `packages/sdk-react` | 1 | 2 ✅ | only `useMeshDevice` + a stubbed `useChat` test; missing `useNodes`, `useChannels`, `useConfig`, `useConnection`, `useTraceroute`, `useTelemetry`, `usePosition`, `useFileTransfer`, `useFavoriteNode`, `useIgnoreNode`, `useMeshRegistry`, `useClientById`, `useActiveClient`. No registry-aware re-render coverage. |
| `packages/sdk-storage-sqlocal` | 2 | 8 ✅ | sql.js only — **no real OPFS test**, no Worker boot test, no cross-tab BroadcastChannel test (mocked away), no migration v1→v2 test |
| `packages/web` | 34 | 294 ✅ | no `useConnections` test; new `meshRegistry` + `sdkStorage` modules untested; chat persistence end-to-end not exercised |
| `packages/transport-*` | 1 each (5 of 7) | varies | `transport-deno` + `transport-mock` have no tests; transports likely lack disconnect/error coverage |
| `packages/core` | 0 | n/a | legacy, slated for deletion in Phase C; tolerable |
| `packages/ui` | 0 | n/a | pure presentational; visual regression only |
| `packages/protobufs` | 0 | n/a | generated code; upstream's responsibility |

## Concrete additions queued (priority order)

1. **`packages/sdk` slice tests** — one Use-case + one Mapper test per slice (`nodes`, `channels`, `config`, `telemetry`, `position`, `traceroute`). Pattern: build a stub `MeshClient`, dispatch a synthetic event, assert signal value or outbound bytes.
2. **`packages/sdk-react` hook tests** — for every hook listed above, mount under `<MeshProvider>`, drive a signal change, assert `result.current`. One file, ~15 cases.
3. **`packages/sdk` `ChatClient` persistence test** — wire `InMemoryMessageRepository`, append messages, re-construct `ChatClient`, assert hydration. Validates the lazy-load contract.
4. **`packages/sdk-storage-sqlocal` migration test** — bootstrap empty DB, run `MIGRATIONS[]`, assert `_schema.version`. Then add a fake `version: 2` migration and prove it's applied idempotently.
5. **`packages/sdk-storage-sqlocal` browser mode** — add a second `vitest.browser.config.ts` using `@vitest/browser` (Playwright provider) so we exercise real OPFS + Worker. CI runs both modes.
6. **`packages/sdk-storage-sqlocal` BroadcastChannel test** — instantiate two `MultiTabCoordinator` instances in same process; one broadcasts, the other observes. (Node has no `BroadcastChannel` global; use `worker_threads`'s `BroadcastChannel` polyfill or jsdom env.)
7. **`packages/web` `meshRegistry` + `sdkStorage` lazy-init test** — assert `getStorageDb()` returns the same promise on repeated calls and only opens the DB once.
8. **`packages/sdk-react` registry test** — mount `<MeshRegistryProvider>` with two clients, switch active, confirm a hook re-renders against the new client.

## E2E / simulator (Tier 6) — scope only

Out of immediate scope; documenting for a follow-up PR.

- Run `meshtasticd` (firmware simulator) in CI Docker via `services:` block.
- Spin up `MeshClient` with `TransportHTTP` pointed at the simulator's HTTP endpoint.
- Drive scripted scenarios: configure → send text → expect ack; channel update; node info exchange; traceroute.
- Use `@vitest/browser` so we also exercise the real OPFS persistence path during E2E.
- Run on `main` only (cost). Smoke subset on PR.

Until that lands, `createFakeTransport()` covers the protocol layer at unit/integration speed.

## Conventions

- Test file colocated with source: `Foo.ts` → `Foo.test.ts`.
- Integration tests under `tests/integration/`.
- Browser-mode tests use the suffix `.browser.test.ts` so they can be filtered.
- Protobuf fixtures live in `__fixtures__/*.fixtures.ts` next to mappers; binary data committed as base64, not raw bytes.
- Each test imports concrete classes from the source path (`./Foo.ts`), not the package barrel — fast type-check, zero re-export drift.
- No mocked SDK from inside SDK tests. Use `createFakeTransport()` and real `MeshClient` instances.

## Running

```sh
pnpm -r test                       # all packages, Node env
pnpm --filter @meshtastic/sdk test
pnpm --filter @meshtastic/sdk-storage-sqlocal test
pnpm --filter meshtastic-web test
# future:
pnpm --filter @meshtastic/sdk-storage-sqlocal test:browser
```
