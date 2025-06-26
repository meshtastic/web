import { z } from "zod/v4";

export const MqttValidationMapReportSettingsSchema = z.object({
  publishIntervalSecs: z.coerce.number().int(),
  positionPrecision: z.coerce.number().int(),
});

export const MqttValidationSchema = z.object({
  enabled: z.boolean(),
  address: z.string().min(0).max(30),
  username: z.string().min(0).max(30),
  password: z.string().min(0).max(30),
  encryptionEnabled: z.boolean(),
  jsonEnabled: z.boolean(),
  tlsEnabled: z.boolean(),
  root: z.string(),
  proxyToClientEnabled: z.boolean(),
  mapReportingEnabled: z.boolean(),
  mapReportSettings: MqttValidationMapReportSettingsSchema,
});

export type MqttValidation = z.infer<typeof MqttValidationSchema>;
