# sdk-preview — a proof-of-direction slice

This folder is a small, self-contained demonstration of the architecture from
**[meshtastic/web#1050](https://github.com/meshtastic/web/pull/1050)** (Dan's
`@meshtastic/sdk` migration), built against the **firmware-current protobufs**
synced in this branch.

It is **not wired into the live app** and replaces nothing. The goal is to show
the *shape* of the SDK direction — domain-driven slices, signals-backed reactive
state, `Result`-returning use-cases, and ports/adapters — without pulling in the
full SDK + sqlocal/OPFS persistence stack.

## What it mirrors

| This slice | `@meshtastic/sdk` (PR #1050) |
| --- | --- |
| `core/signals` (`createStore`, `SignalMap`, `ReadonlySignal`) | `core/signals` |
| `core/errors` (`MeshError`, `toMeshError`) | `core/errors` |
| `core/client/MeshClientPort` (minimal port) | `core/client/MeshClient` |
| `features/config/domain` (`RadioConfig`, `ModuleConfig`, `ConfigEditor`) | same |
| `features/config/application/ConfigUseCases` (`Result<number, MeshError>`) | same |
| `features/config/infrastructure` (`ConfigMapper`, `configBuilders`) | same |
| `react/useSignal`, `react/useConfigEditor` | `@meshtastic/sdk-react` |
| `adapters/fromMeshDevice` | the SDK's transport/registry wiring |

## The pattern on display: `ConfigEditor`

`ConfigEditor` is the piece that replaces today's Zustand `changeRegistry`. It
keeps two reactive views per config section:

- **baseline** — device truth, updated automatically from `onConfigPacket` /
  `onModuleConfigPacket`.
- **working** — the UI's in-flight edits.

A mid-edit packet from the device updates the baseline but **does not clobber a
section the user is editing**; `commit()` sends only the dirty sections inside a
`beginEdit → setConfig…/setModuleConfig… → commitEdit` envelope and returns a
`Result`; disconnect resets everything so a stale working copy can't leak across
reconnects. See `features/config/__tests__/ConfigEditor.test.ts`.

## Why this ties the branch together

`RadioConfigSection` / `ModuleConfigSection` are **derived from the protobufs**
(`Exclude<…payloadVariant["case"]>`), and `ConfigMapper` is fully generic. Because
this branch already synced the firmware-current protobufs, the new modules
(`trafficManagement`, `statusmessage`, `tak`, `remoteHardware`) and new config
fields flow through the domain, mapper, editor, and dirty-tracking **with zero
per-section code** — which is exactly the leverage the SDK migration is built on.

## Wiring it into a page (illustrative)

```tsx
import { useConfigEditor, useSignal } from "@app/sdk-preview";

function TrafficManagementPanel() {
  const editor = useConfigEditor();
  const modules = useSignal(editor?.modules ?? /* empty signal */);
  const isDirty = useSignal(editor?.isDirty ?? /* false signal */);
  // editor.setModuleSection("trafficManagement", next); … editor.commit();
}
```

## Deliberately out of scope

- Channels / owner / queued-admin editing (need the channels + nodes slices).
- `@meshtastic/sdk-storage-sqlocal` (OPFS SQLite) persistence.
- The full `MeshClient` / `MeshRegistry` multi-device client.
- Live UI adoption — that's the slice-by-slice migration tracked in PR #1050's
  follow-ups.
