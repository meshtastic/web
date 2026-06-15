import { execSync } from "node:child_process";

/**
 * Tears the mesh down in CI (or when E2E_DOCKER_DOWN=1). Locally it is left
 * running by default so repeated runs are fast and node identities are stable.
 */
const MODE = process.env.E2E_DEVICE_MODE ?? "docker";
const COMPOSE_FILE = "e2e/device/docker-compose.yml";

export default async function globalTeardown(): Promise<void> {
  const shouldDown = !!process.env.CI || process.env.E2E_DOCKER_DOWN === "1";
  if (MODE !== "docker") return;
  if (shouldDown) {
    console.log("[e2e] tearing down meshtasticd mesh ...");
    execSync(`docker compose -f ${COMPOSE_FILE} down -v`, { stdio: "inherit" });
  } else {
    console.log("[e2e] leaving meshtasticd mesh running (set E2E_DOCKER_DOWN=1 to stop).");
  }
}
