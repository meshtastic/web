import { fromBinary } from "@bufbuild/protobuf";
import * as Protobuf from "@meshtastic/protobufs";
import type { MeshClient } from "../client/MeshClient.ts";

type AdminCase = NonNullable<
  Protobuf.Admin.AdminMessage["payloadVariant"]["case"]
>;
type ConfigVariant = Protobuf.Config.Config["payloadVariant"];
type ModuleConfigVariant = Protobuf.ModuleConfig.ModuleConfig["payloadVariant"];
type ConfigCase = NonNullable<ConfigVariant["case"]>;
type ModuleConfigCase = NonNullable<ModuleConfigVariant["case"]>;
type ConfigValue<K extends ConfigCase> = Extract<
  ConfigVariant,
  { case: K }
>["value"];
type ModuleConfigValue<K extends ModuleConfigCase> = Extract<
  ModuleConfigVariant,
  { case: K }
>["value"];

export interface HeldSend {
  /** Resolves once the send is being held. */
  reached: Promise<void>;
  release(): void;
}

export interface AdminMessageInterceptor {
  /** Every admin message sent, decoded, in order. */
  sent: Protobuf.Admin.AdminMessage[];
  cases(): (AdminCase | undefined)[];
  /** Hold the next send of `adminCase` open until released. */
  hold(adminCase: AdminCase): HeldSend;
  /** Make the next send of `adminCase` fail. */
  failNext(adminCase: AdminCase): void;
  sentConfig<K extends ConfigCase>(section: K): ConfigValue<K> | undefined;
  sentModuleConfig<K extends ModuleConfigCase>(
    section: K,
  ): ModuleConfigValue<K> | undefined;
}

/**
 * Replace `client.sendPacket` so a test can see the admin messages a commit
 * sends, and pause or fail individual sends.
 */
export function interceptAdminMessages(
  client: MeshClient,
): AdminMessageInterceptor {
  const sent: Protobuf.Admin.AdminMessage[] = [];
  const holds: {
    adminCase: AdminCase;
    onReached: () => void;
    released: Promise<void>;
  }[] = [];
  const failures: AdminCase[] = [];

  client.sendPacket = (async (payload: Uint8Array) => {
    const admin = fromBinary(Protobuf.Admin.AdminMessageSchema, payload);
    sent.push(admin);
    const adminCase = admin.payloadVariant.case;

    const failure = failures.indexOf(adminCase as AdminCase);
    if (failure !== -1) {
      failures.splice(failure, 1);
      throw new Error(`send failed: ${adminCase}`);
    }

    const index = holds.findIndex((h) => h.adminCase === adminCase);
    const hold = index === -1 ? undefined : holds.splice(index, 1)[0];
    if (hold) {
      hold.onReached();
      await hold.released;
    }
    return 1;
  }) as MeshClient["sendPacket"];

  return {
    sent,
    cases: () => sent.map((admin) => admin.payloadVariant.case),
    hold(adminCase) {
      let onReached!: () => void;
      let release!: () => void;
      const reached = new Promise<void>((resolve) => {
        onReached = resolve;
      });
      const released = new Promise<void>((resolve) => {
        release = resolve;
      });
      holds.push({ adminCase, onReached, released });
      return { reached, release };
    },
    failNext(adminCase) {
      failures.push(adminCase);
    },
    sentConfig<K extends ConfigCase>(section: K) {
      for (const admin of sent) {
        if (admin.payloadVariant.case !== "setConfig") continue;
        const variant = admin.payloadVariant.value.payloadVariant;
        if (variant.case === section) {
          return variant.value as ConfigValue<K>;
        }
      }
      return undefined;
    },
    sentModuleConfig<K extends ModuleConfigCase>(section: K) {
      for (const admin of sent) {
        if (admin.payloadVariant.case !== "setModuleConfig") continue;
        const variant = admin.payloadVariant.value.payloadVariant;
        if (variant.case === section) {
          return variant.value as ModuleConfigValue<K>;
        }
      }
      return undefined;
    },
  };
}
