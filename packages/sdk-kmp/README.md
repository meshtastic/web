# @meshtastic/sdk-kmp

The [Kotlin Multiplatform meshtastic-sdk](https://github.com/meshtastic/meshtastic-sdk)
compiled to JavaScript, plus the small Kotlin/JS facade the web client talks to.
The SDK owns all mesh and connection behaviour (handshake, connection state,
auto-reconnect, node DB, admin); this package owns only the glue:

- `src/jsMain/kotlin/org/meshtastic/sdk/js/Client.kt`: the `@JsExport` surface
  (`createHttpClient`, `createSerialClient`, `createBluetoothClient`,
  `MeshtasticClient`, `ConnectionStateJs`). Only plain objects, `Promise`s,
  `Uint8Array`s and unsubscribe functions cross into TypeScript; protobuf
  messages cross as bytes and are decoded with `@meshtastic/protobufs`.
  Sends return a `SendHandleJs` (the packet id now, the outcome later).
- `Storage.kt`: `StorageJs` / `DeviceStorageJs`, the SDK's `StorageProvider`
  and `DeviceStorage` as a host-implemented object the factories accept, so
  the web keeps the SDK's node DB, config bundle, channels and heartbeats in
  its own sqlocal database.
- Browser transports implementing the SDK's `RadioTransport`: `HttpTransport.kt`
  (device HTTP API with Chrome Local Network Access handling in `Lna.kt`),
  `WebSerialTransport.kt` (stream framing from `Framing.kt`) and
  `WebBluetoothTransport.kt` (the Meshtastic GATT service). Neither prompts:
  `requestPort` / `requestDevice` are the web client's job, inside a click
  handler, and the chosen handle is passed to the factory; every automatic
  connect and reconnect reopens through `navigator.serial.getPorts()` (matched
  on the saved USB ids) or `navigator.bluetooth.getDevices()`. The SDK's
  `BleTransport` (Kable) is not used because `transport-ble` has no `js`
  target in the published artifacts.

## Tests

```bash
pnpm --filter @meshtastic/sdk-kmp test
```

runs the `jsTest` suite on Node (`./gradlew jsNodeTest`): the frame assembler
and both transports against scripted `navigator.serial` / `navigator.bluetooth`
fakes.

## Prerequisites

- **JDK 21.** On macOS: `brew install openjdk@21` and
  `export JAVA_HOME=/opt/homebrew/opt/openjdk@21`. The Gradle wrapper is
  committed; Gradle itself is downloaded on first use.
- Node.js on `PATH` (already required by the workspace); the Kotlin build and
  the vendored SDK's `js` target use it for their own tooling.
- The `vendor/meshtastic-sdk` submodule (see "SDK version" below).

## Building

```bash
pnpm --filter @meshtastic/sdk-kmp build
```

runs `./gradlew jsBrowserProductionLibraryDistribution` and copies the ES
modules and `sdk-kmp.d.mts` into `dist/`, which the workspace consumes as
`@meshtastic/sdk-kmp`. `apps/web`'s `predev` and `prebuild` hooks run
`ensure-dist`, which only builds when `dist/` is missing, so `pnpm dev` works
from a clean checkout once JDK 21 is installed.

## SDK version

The SDK version is pinned once, in `gradle.properties`:

```properties
meshtasticSdkVersion=0.2.1-spike-js-target-SNAPSHOT
```

Until meshtastic-sdk publishes its `js` artifacts
([meshtastic/meshtastic-sdk#215](https://github.com/meshtastic/meshtastic-sdk/pull/215)),
the SDK compiles from source: `vendor/meshtastic-sdk` is a git submodule
pinned to that PR's head (`danditomaso/meshtastic-sdk`, branch
`feat/js-target`), and `settings.gradle.kts` includes it as a composite build,
substituting `org.meshtastic:sdk-core` and `sdk-testing` with the included
`:core` and `:testing` projects. No Maven repository, local or remote, serves
the SDK. `ensure-dist` and `build` run `git submodule update --init` when the
submodule is missing; a fresh clone can also use
`git clone --recurse-submodules`. CI checks it out with
`actions/checkout`'s `submodules: true`.

Once #215 is released, the switch to Maven Central is: set
`meshtasticSdkVersion` to the release, delete the `includeBuild` block from
`settings.gradle.kts`, and remove the submodule
(`git rm vendor/meshtastic-sdk` and its `.gitmodules` entry).
