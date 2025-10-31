import { featureFlags } from "@core/services/featureFlags";

const isDev = typeof import.meta !== "undefined" && import.meta.env?.DEV;
console.log(`Dev mode: ${isDev}`);

if (isDev) {
  featureFlags.setOverrides({
    persistNodeDB: true,
    persistMessages: true,
    persistApp: true,
  });
}
