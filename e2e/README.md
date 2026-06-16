# Real-device E2E messaging suite

Playwright tests that drive the **real web app** in Chromium against a **real
Meshtastic device** over the HTTP(S) phone API and verify **text messaging in
both directions** across a two-node mesh.

By default the "devices" are two simulated `meshtasticd` firmware nodes running
in Docker, meshed over the firmware's built-in **UDP multicast** LAN transport
(`224.0.0.69:4403`) — real firmware, real encryption, distinct node numbers, and
**no MQTT/relay**. The same tests can run against physical hardware.

```
   Playwright (headless Chromium)                 Python peer (meshtastic lib)
   ── HTTPS phone API :9443 ────┐                 ┌──── TCP phone API :4403 ────
                                ▼                 ▼
                    ┌─────────────────┐  UDP multicast  ┌─────────────────┐
                    │  Node A (DUT)   │  224.0.0.69     │   Node B (peer) │
                    │ meshtasticd sim │◀─── mesh ──────▶│ meshtasticd sim │
                    └─────────────────┘                 └─────────────────┘
```

- **Node A** is the device-under-test the browser connects to (HTTPS).
- **Node B** is driven/observed by the Python peer (`e2e/peer/peer.py`) over TCP.

## Layout

| Path | What |
| --- | --- |
| `playwright.config.ts` | Config (root): chromium, serial, dev server on :3100, global setup/teardown |
| `e2e/global-setup.ts` / `global-teardown.ts` | Bring the mesh up / wait for readiness / tear down |
| `e2e/device/docker-compose.yml` + `nodeA.yaml` / `nodeB.yaml` | The two `meshtasticd` sim nodes |
| `e2e/peer/peer.py` + `requirements.txt` | The off-browser mesh peer (TCP `meshtastic` lib) |
| `e2e/fixtures/` | `peer.ts` (peer wrapper) + `test.ts` (page-object + device fixtures) |
| `e2e/pages/` | `ConnectionPage.ts`, `MessagesPage.ts` |
| `e2e/tests/` | `connect`, `messaging.broadcast`, `messaging.direct` |

## Running locally (Docker sim — default)

Prerequisites: Docker, Node + pnpm (`11.5.2`), Python 3.11+.

```bash
pnpm install
pnpm exec playwright install chromium
python -m venv e2e/peer/.venv && e2e/peer/.venv/bin/pip install -r e2e/peer/requirements.txt

pnpm test:e2e            # brings up the mesh, runs the suite
pnpm test:e2e:report     # open the HTML report
```

Global setup runs `docker compose up -d` (idempotent) and waits for the device.
The mesh is **left running** between runs for speed; set `E2E_DOCKER_DOWN=1` to
tear it down on exit. CI leaves the containers up through the run (so the
workflow can dump device logs on failure) and tears them down in a final step.

## Environment variables

| Var | Default | Purpose |
| --- | --- | --- |
| `E2E_DEVICE_MODE` | `docker` | `docker` (sim) or `hardware` (skip compose) |
| `E2E_NODE_A_URL` | `https://127.0.0.1:9443` | Device-under-test the browser connects to |
| `E2E_PEER_HOST` / `E2E_PEER_PORT` | `127.0.0.1` / `14404` | TCP phone API the Python peer drives |
| `E2E_WEB_PORT` | `3100` | Dev-server port for the app under test |
| `E2E_PEER_PYTHON` | `e2e/peer/.venv/bin/python` | Python used to run the peer |
| `E2E_DOCKER_DOWN` | _unset_ | `1` to `compose down` on teardown (CI tears down in a final workflow step) |

## Running against real hardware

Point the suite at two physical devices on the same channel/region. Node A must
expose the **HTTP(S) phone API** (Wi-Fi); the peer reaches Node B over **TCP**
(Wi-Fi) — both on the same LoRa mesh, so the radio is the bridge (no MQTT):

```bash
E2E_DEVICE_MODE=hardware \
E2E_NODE_A_URL=https://<deviceA-ip> \
E2E_PEER_HOST=<deviceB-ip> E2E_PEER_PORT=4403 \
pnpm test:e2e
```

## What the tests cover

- **connect** — add an HTTP(S) connection in the UI, complete the config
  handshake, land on the messages view.
- **messaging.broadcast** — `mesh → web` (peer broadcasts, the browser renders
  it) and `web → mesh` (the browser sends, the peer node confirms receipt over
  the real mesh).
- **messaging.direct** — `fixme` (see Known limitations).

## Gotchas baked in (firmware/sim specifics)

- **Image tag**: use `meshtastic/meshtasticd:daily-debian`. `:latest` is `2.7.15`
  and predates the `EnableUDP` multicast feature (no mesh between sim nodes).
- **Do not pass `--sim`**: `force_simradio` takes an early branch in
  `portduinoSetup()` that skips config-file loading — Webserver / `EnableUDP` /
  `MACAddress` would all be ignored. Select the sim radio via `Lora: Module: sim`
  in the config instead.
- **Distinct `MACAddress`** per node → distinct node numbers (else the UDP
  handler drops the peer's packets as "spoofed local origin").
- **Webserver is HTTPS-only** (self-signed cert on 9443) — Playwright uses
  `ignoreHTTPSErrors` + `--ignore-certificate-errors`; the dialog's HTTPS toggle
  is on. The app is served over plain HTTP to avoid mixed-content.
- **Send readiness**: the composer renders before the SDK chat client is ready
  (the SQLite/OPFS `sqlocal` store times out in headless Chromium and falls back
  to in-memory). `MessagesPage.waitReady()` gates on the "Connected" status so an
  immediate send isn't silently dropped.

## Known limitations

- **Direct messages (`messaging.direct`) are `fixme` — a SimRadio limitation, not
  a web-app issue.** DMs go out PKI-encrypted. PKI keygen is gated on a set LoRa
  region (NodeDB.cpp:3051; the sim boots region-UNSET) — setting `lora.region`
  via admin *does* make the nodes generate and exchange keys (verified: both
  learn each other's public key). But a PKI DM still can't traverse the SimRadio:
  the PKC overhead exceeds its payload limit (`Payload size larger than compressed
  message allows! Send empty payload`), so the packet is truncated and the
  receiver NAKs `NO_CHANNEL` (`No suitable channel found for decoding, hash 0x0`).
  The firmware skips PKC under `--sim` (Router.cpp:730) for exactly this reason,
  but `--sim` also disables the config-file loading (Webserver/EnableUDP/MAC) the
  web app needs, so the two are mutually exclusive. The app behaves correctly
  (key-refresh dialog). Broadcast covers bidirectional messaging; re-enable
  against real hardware, where real LoRa carries PKC fine.

## App bugs surfaced by this suite (fixed on this branch)

1. **Connect-on-save race** (`apps/web/src/pages/Connections/useConnections.ts`):
   `connect()` read the just-added connection from a stale memoized closure, so
   "Save" never actually connected ("unknown connection id"). Fixed to read from
   the live store.
2. **`ReferenceError: nodeDB is not defined`** (`apps/web/src/core/subscriptions.ts`):
   the device-metrics telemetry handler called a node store the #1050 migration
   removed, throwing on every telemetry packet. Fixed by folding device metrics
   into the node inside the SDK `NodesClient` (`onTelemetryPacket`) and dropping
   the dead app-side handler.
