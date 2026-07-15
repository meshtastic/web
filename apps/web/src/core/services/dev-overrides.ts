import { featureFlags } from "@core/services/featureFlags";

const isDev = typeof import.meta !== "undefined" && import.meta.env?.DEV;

if (isDev) {
  console.log(`Dev mode: ${isDev}`);
  featureFlags.setOverrides({
    persistMessages: true,
    persistApp: true,
  });
}
