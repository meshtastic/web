import { featureFlags } from "@core/services/featureFlags";
import logger from "./logger.ts";

const isDev = typeof import.meta !== "undefined" && import.meta.env?.DEV;
logger.debug(`Dev mode: ${isDev}`);

if (isDev) {
  featureFlags.setOverrides({
    persistNodeDB: true,
    persistMessages: true,
    persistApp: true,
  });
}
