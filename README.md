# Meshtastic Web Monorepo

[![CI](https://img.shields.io/github/actions/workflow/status/meshtastic/web/ci.yml?branch=main&label=Web%20CI&logo=github&color=yellow)](https://github.com/meshtastic/web/actions/workflows/ci.yml)
[![CLA assistant](https://cla-assistant.io/readme/badge/meshtastic/web)](https://cla-assistant.io/meshtastic/web)
[![Fiscal Contributors](https://opencollective.com/meshtastic/tiers/badge.svg?label=Fiscal%20Contributors&color=deeppink)](https://opencollective.com/meshtastic/)
[![Vercel](https://img.shields.io/static/v1?label=Powered%20by&message=Vercel&style=flat&logo=vercel&color=000000)](https://vercel.com?utm_source=meshtastic&utm_campaign=oss)

## Overview

This monorepo contains the official [Meshtastic](https://meshtastic.org) web
client, the shared UI library it uses, the generated protobuf stubs, and
`sdk-kmp`, a thin JavaScript facade over the Kotlin
[meshtastic-sdk](https://github.com/meshtastic/meshtastic-sdk) that handles
device connections and mesh state.

> [!NOTE]
> You can find the main Meshtastic documentation at https://meshtastic.org/docs/introduction/.

## Packages

| Package | Purpose |
| --- | --- |
| `apps/web` | Reference React web client. Hosted at [client.meshtastic.org](https://client.meshtastic.org). |
| `packages/sdk-kmp` | Wraps the Kotlin Multiplatform [meshtastic-sdk](https://github.com/meshtastic/meshtastic-sdk), compiled to JavaScript with Gradle (JDK 21), behind a small `@JsExport` facade plus browser transports. The web client's connection and mesh behaviour comes from here. The SDK source is pinned as a git submodule at `packages/sdk-kmp/vendor/meshtastic-sdk`. |
| `packages/ui` | Shared Radix + Tailwind component library. |
| `packages/protobufs` | Generated TypeScript stubs from [`meshtastic/protobufs`](https://github.com/meshtastic/protobufs), produced via `buf generate`. Source of truth for every wire-level type. |

All packages under `packages/` are private workspace packages; none are
published to npm or JSR from this repository.

## Architecture

The web client never speaks the Meshtastic protocol itself. `apps/web` calls
the facade in `packages/sdk-kmp`, which drives the Kotlin SDK (framing, packet
queue, state, persistence) over a browser transport (Web Serial, Web Bluetooth,
or HTTP). Wire-level types come from `packages/protobufs`. See
`packages/sdk-kmp/README.md` for the facade surface and how the SDK version is
pinned.

## Getting Started

### Prerequisites

- [pnpm](https://pnpm.io/) — package manager for the workspace.
- [Buf CLI](https://buf.build/docs/cli/installation/) — required whenever
  `@meshtastic/protobufs` needs to build (which happens on a full
  `pnpm -r build`, since it runs `buf generate`). If you only want to run
  the web client in dev, `pnpm --filter meshtastic-web dev` does not need
  Buf as long as the protobuf stubs are already generated.
- [JDK 21](https://adoptium.net/) — required to build `@meshtastic/sdk-kmp`,
  the Kotlin meshtastic-sdk compiled to JavaScript that the web client
  connects through. `pnpm --filter meshtastic-web dev` builds it on first
  run (its `predev` hook); on macOS `brew install openjdk@21` and
  `export JAVA_HOME=/opt/homebrew/opt/openjdk@21`. Until the SDK's `js`
  artifacts are released, it compiles from the `packages/sdk-kmp/vendor/meshtastic-sdk`
  git submodule (clone with `--recurse-submodules`, or let the build run
  `git submodule update --init`). See `packages/sdk-kmp/README.md` for how
  the SDK version is pinned and how to switch to the release.

### Setup

```bash
git clone --recurse-submodules https://github.com/meshtastic/web.git
cd web
pnpm install
```

### Run the web client

```bash
pnpm --filter meshtastic-web dev
```

### Build everything

Requires the Buf CLI (see Prerequisites) — `@meshtastic/protobufs` runs
`buf generate` as part of its `build` script.

```bash
pnpm -r build
```

`pnpm -r` sorts packages by their `workspace:` dependencies (dependencies
before dependents) and runs up to `--workspace-concurrency` packages in
parallel. Packages linked over other protocols (for example `jsr:`) are
not sequenced against workspace peers, so run `pnpm --filter
@meshtastic/protobufs build` first if you are iterating on generated
stubs consumed via a non-workspace protocol.

If you only need the web client, build it and its dependency graph:

```bash
pnpm --filter meshtastic-web... build
```

### Run tests

```bash
pnpm -r test
```

### Lint + format

```bash
pnpm check
pnpm check:fix
```

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for the full workflow, branch and
commit conventions, and i18n guidance. Translations live in the
[Translation Contribution Guide](./CONTRIBUTING_TRANSLATIONS.md); adding
new user-facing strings is covered by the
[i18n Developer Guide](./CONTRIBUTING_I18N_DEVELOPER_GUIDE.md).

## Developing

### Testing

Vitest is wired at the repo root (`pnpm test`) and picks up the `packages/*` and
`apps/*` projects. See `TESTING.md` for the testing strategy.

## Repository activity

| Project        | Repobeats                                                                                                             |
| :------------- | :-------------------------------------------------------------------------------------------------------------------- |
| Meshtastic Web | ![Alt](https://repobeats.axiom.co/api/embed/e5b062db986cb005d83e81724c00cb2b9cce8e4c.svg "Repobeats analytics image") |

## Feedback

If you encounter any issues, please report them in our
[issues tracker](https://github.com/meshtastic/web/issues). Your feedback helps
improve the stability of future releases.

## Star history

<a href="https://star-history.com/#meshtastic/web&Date">
 <picture>
   <source media="(prefers-color-scheme: dark)" srcset="https://api.star-history.com/svg?repos=meshtastic/web&type=Date&theme=dark" />
   <source media="(prefers-color-scheme: light)" srcset="https://api.star-history.com/svg?repos=meshtastic/web&type=Date" />
   <img alt="Star History Chart" src="https://api.star-history.com/svg?repos=meshtastic/web&type=Date" width="100%" />
 </picture>
</a>

## Contributors

<a href="https://github.com/meshtastic/web/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=meshtastic/web" width="100%"/>
</a>

## License

GPL-3.0-only. See [LICENSE](LICENSE).
