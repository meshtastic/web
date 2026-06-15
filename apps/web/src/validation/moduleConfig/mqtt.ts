import { z } from "zod/v4";

export const MqttValidationMapReportSettingsSchema = z.object({
  publishIntervalSecs: z.coerce.number().int(),
  positionPrecision: z.coerce.number().int(),
  shouldReportLocation: z.boolean(),
});

export const MqttValidationSchema = z.object({
  enabled: z.boolean(),
  address: z.string().min(0).max(63),
  username: z.string().min(0).max(63),
  password: z.string().min(0).max(63),
  encryptionEnabled: z.boolean(),
  jsonEnabled: z.boolean(),
  tlsEnabled: z.boolean(),
  root: z.string().max(31),
  proxyToClientEnabled: z.boolean(),
  mapReportingEnabled: z.boolean(),
  mapReportSettings: MqttValidationMapReportSettingsSchema,
});

export type MqttValidation = z.infer<typeof MqttValidationSchema>;
