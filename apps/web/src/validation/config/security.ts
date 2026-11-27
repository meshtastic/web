import { Protobuf } from "@core/protobuf.ts";
import { type ZodType, z } from "zod/v4";
import { makePskHelpers } from "./../pskSchema.ts";

const { stringSchema, bytesSchema, isValidKey } = makePskHelpers([32]); // 256-bit

const PacketSignaturePolicyEnum = z.enum(
  Protobuf.Config.Config_SecurityConfig_PacketSignaturePolicy,
);

const isManagedRequiredMsg = "formValidation.required.managed";
const adminKeyIsPrivateKeyMsg = "formValidation.adminKey.isPrivateKey";
const adminKeyIsOwnKeyMsg = "formValidation.adminKey.isOwnPublicKey";

function sameKey(a: unknown, b: unknown): boolean {
  if (!isValidKey(a) || !isValidKey(b)) return false;
  if (typeof a === "string" || typeof b === "string") return a === b;
  const x = a as Uint8Array;
  const y = b as Uint8Array;
  return x.byteLength === y.byteLength && x.every((byte, i) => byte === y[i]);
}

function makeSecuritySchema<KeyT>(
  keyMaker: (optional: boolean) => ZodType<KeyT>,
  { privateKeyOptional = false }: { privateKeyOptional?: boolean } = {},
) {
  return z
    .object({
      isManaged: z.boolean(),
      debugLogApiEnabled: z.boolean(),
      serialEnabled: z.boolean(),
      packetSignaturePolicy: PacketSignaturePolicyEnum,

      privateKey: keyMaker(privateKeyOptional),
      publicKey: keyMaker(false),
      adminKey: z.tuple([keyMaker(true), keyMaker(true), keyMaker(true)]),
    })
    .check((ctx) => {
      // An admin key is another radio's public key. This radio's own keys
      // match no other radio, so with managed mode on nothing could
      // change its settings.
      ctx.value.adminKey.forEach((key, index) => {
        const message = sameKey(key, ctx.value.privateKey)
          ? adminKeyIsPrivateKeyMsg
          : sameKey(key, ctx.value.publicKey)
            ? adminKeyIsOwnKeyMsg
            : undefined;
        if (!message) return;
        ctx.issues.push({
          code: "custom",
          message,
          path: ["adminKey", index],
          input: ctx.value,
        });
      });
      if (ctx.value.isManaged) {
        const hasAdmin = ctx.value.adminKey.some(isValidKey);
        if (!hasAdmin) {
          for (const path of [["isManaged"], ["adminKey", 0]] as const) {
            ctx.issues.push({
              code: "custom",
              message: isManagedRequiredMsg,
              path: [...path],
              input: ctx.value,
            });
          }
        }
      }
    });
}

export const RawSecuritySchema = makeSecuritySchema(stringSchema);
export type RawSecurity = z.infer<typeof RawSecuritySchema>;

/**
 * A remote node's security section: firmware never sends its private key
 * over remote admin, so the form has none.
 */
export const RemoteRawSecuritySchema = makeSecuritySchema(stringSchema, {
  privateKeyOptional: true,
});

export const ParsedSecuritySchema = makeSecuritySchema(bytesSchema);
export type ParsedSecurity = z.infer<typeof ParsedSecuritySchema>;
