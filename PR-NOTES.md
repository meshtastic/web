# Protobuf catch-up to firmware-current

> Draft PR description + the one decision for maintainers. This file is **untracked** —
> use it as the PR body, then delete it (or leave it, it won't be committed).

## What this does

- Syncs the vendored `.proto` sources in `packages/protobufs/meshtastic/` from ~v2.7.20 to
  **firmware-current (v2.7.25 + 48 commits)** — +2 new files (`deviceonly_legacy`, `serial_hal`)
  and additions across `config` / `module_config` / `mesh` / `admin` / `portnums` / `telemetry`.
- Regenerates the v2 TS bindings (`buf generate`).
- Makes the app consume the **workspace** protobufs (`workspace:*`) instead of the stale JSR
  `@meshtastic/protobufs@2.7.20`, finishing the monorepo migration that was half-done
  (`@meshtastic/core` was already `workspace:*`; protobufs was still on JSR).
- One breaking-change fix: `admin.proto` `nodedb_reset` changed `int32 → bool`, so
  `MeshDevice.resetNodes()` now sends `value: true` (the oneof-case presence triggers the
  reset; `true` preserves favorites through it).

## Free wins (dynamic enum dropdowns — no UI code)

New LoRa regions (ITU/EU amateur bands), modem presets (LONG_TURBO, LITE/NARROW/TINY_*),
~25 hardware names, `OLED_SH1107_ROTATED`, serial `LOG`/`LOGTEXT` — they flow into the
existing enum-bound `<select>`s automatically once the bindings regenerate.

## Breaking proto changes that DON'T break us (verified)

- `deviceonly.proto` `NodeInfoLite` restructure — core never imports `NodeInfoLite`.
- `channel.proto` `is_client_muted → is_muted` + `mute` removed — neither web nor core
  references those fields yet.

## The one decision for maintainers — how to consume the protobufs

This changeset takes **Option A (workspace consumption):** rename the workspace package
`@meshtastic/protobufs-ws → @meshtastic/protobufs` (still `private`), point its `exports` at the
TS source, and depend on it via `workspace:*` from root + core.

- ✅ Monorepo is self-consuming and always firmware-current; no publish round-trip; matches
  the already-migrated `@meshtastic/core`.
- ⚠️ Diverges from the JSR publish flow; the published JSR `@meshtastic/protobufs`
  (latest 2.7.23) is no longer what the app builds against.

**Option B (canonical publish flow):** keep the package JSR-published — sync the `.proto`
sources here, publish a new `@meshtastic/protobufs` to JSR, then bump the root range.

- ✅ Stays on the established pipeline; one source of truth on JSR.
- ⚠️ Needs a JSR publish, and can't reach firmware-current until that release lands
  (JSR tops out at 2.7.23, still behind firmware).

If you prefer **B**, everything except the 3 dependency-wiring edits still applies — the
`.proto` sync, the regen, and the `nodedbReset` fix are identical; only the root dep, the core
dep, and the protobufs `package.json` name/exports get swapped for a JSR publish + range bump.

## Regenerating bindings

```
pnpm --filter @meshtastic/protobufs gen
```

Output lands in `packages/protobufs/packages/ts/dist/` (gitignored).

## Verified in isolation (this branch only — no feature/demo code)

- `packages/core` typecheck: clean except 2 **pre-existing** `queue.ts` strict-catch errors.
- `packages/web` `vite build`: green.
- 36 config/module validation tests: pass.
