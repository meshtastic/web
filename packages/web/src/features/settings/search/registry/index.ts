import type { FieldRegistryEntry } from "../types.ts";
import { advancedFieldRegistry } from "./advancedFields.ts";
import { appFieldRegistry } from "./appFields.ts";
import { deviceFieldRegistry } from "./deviceFields.ts";
import { moduleFieldRegistry } from "./moduleFields.ts";
import { radioFieldRegistry } from "./radioFields.ts";

/**
 * Complete registry of all searchable fields in settings.
 */
export const allFieldRegistries: FieldRegistryEntry[] = [
  ...deviceFieldRegistry,
  ...radioFieldRegistry,
  ...moduleFieldRegistry,
  ...appFieldRegistry,
  ...advancedFieldRegistry,
];

export {
  advancedFieldRegistry,
  appFieldRegistry,
  deviceFieldRegistry,
  moduleFieldRegistry,
  radioFieldRegistry,
};
