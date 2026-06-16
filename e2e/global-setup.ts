import { execSync } from "node:child_process";
import { request } from "node:https";
import { Socket } from "node:net";

/**
 * Brings up the device topology and waits until it is reachable.
 *
 * - docker mode (default): starts the two `meshtasticd` sim nodes via compose.
 * - hardware mode (E2E_DEVICE_MODE=hardware): skips compose; expects the env
 *   endpoints to point at real devices.
 */
const MODE = process.env.E2E_DEVICE_MODE ?? "docker";
const COMPOSE_FILE = "e2e/device/docker-compose.yml";
const NODE_A_URL = process.env.E2E_NODE_A_URL ?? "https://127.0.0.1:9443";
const PEER_HOST = process.env.E2E_PEER_HOST ?? "127.0.0.1";
const PEER_PORT = Number(process.env.E2E_PEER_PORT ?? 14404);

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Poll the device HTTPS phone API until it answers (cert is self-signed). */
async function waitForHttps(url: string, timeoutMs: number): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  let lastErr = "connection refused";
  while (Date.now() < deadline) {
    const ok = await new Promise<boolean>((resolve) => {
      const req = request(
        url,
        { method: "GET", rejectUnauthorized: false, timeout: 4000 },
        (res) => {
          res.resume();
          resolve((res.statusCode ?? 0) > 0);
        },
      );
      req.on("error", (e) => {
        lastErr = e.message;
        resolve(false);
      });
      req.on("timeout", () => {
        req.destroy();
        resolve(false);
      });
      req.end();
    });
    if (ok) return;
    await sleep(1000);
  }
  throw new Error(`device webserver not ready at ${url} within ${timeoutMs}ms (last: ${lastErr})`);
}

/** Poll a TCP port until it accepts a connection. */
async function waitForTcp(host: string, port: number, timeoutMs: number): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  let lastErr = "connection refused";
  while (Date.now() < deadline) {
    const ok = await new Promise<boolean>((resolve) => {
      const sock = new Socket();
      sock.setTimeout(3000);
      sock.once("connect", () => {
        sock.destroy();
        resolve(true);
      });
      sock.once("error", (e) => {
        lastErr = e.message;
        sock.destroy();
        resolve(false);
      });
      sock.once("timeout", () => {
        sock.destroy();
        resolve(false);
      });
      sock.connect(port, host);
    });
    if (ok) return;
    await sleep(1000);
  }
  throw new Error(
    `peer node TCP not ready at ${host}:${port} within ${timeoutMs}ms (last: ${lastErr})`,
  );
}

export default async function globalSetup(): Promise<void> {
  if (MODE === "docker") {
    console.log("[e2e] bringing up meshtasticd two-node mesh ...");
    execSync(`docker compose -f ${COMPOSE_FILE} up -d`, { stdio: "inherit" });
  } else {
    console.log(`[e2e] hardware mode: device=${NODE_A_URL} peer=${PEER_HOST}:${PEER_PORT}`);
  }

  console.log(`[e2e] waiting for device webserver ${NODE_A_URL} ...`);
  await waitForHttps(`${NODE_A_URL}/api/v1/fromradio?all=true`, 120_000);
  console.log(`[e2e] waiting for peer node ${PEER_HOST}:${PEER_PORT} ...`);
  await waitForTcp(PEER_HOST, PEER_PORT, 60_000);
  console.log("[e2e] topology ready.");
}
