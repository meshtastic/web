import { featureFlags } from "@core/services/featureFlags";

const isDev =
  (typeof import.meta !== "undefined" && import.meta.env?.DEV) ||
  (typeof process !== "undefined" &&
    (process.env.mode === "development" ||
      process.env.NODE_ENV === "development"));

if (isDev) {
  featureFlags.setOverrides({
    persistNodeDB: true,
  });
}
