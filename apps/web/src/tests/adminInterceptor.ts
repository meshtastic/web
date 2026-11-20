import { create, fromBinary } from "@bufbuild/protobuf";
import { adminOk, type FakeKmpClient } from "@core/kmp/fakeClient.ts";
import { Protobuf } from "@core/protobuf.ts";
import type { AdminResultJs } from "@meshtastic/sdk-kmp";

type AdminCase = NonNullable<
  Protobuf.Admin.AdminMessage["payloadVariant"]["case"]
>;
type ConfigVariant = Protobuf.Config.Config["payloadVariant"];
type ModuleConfigVariant = Protobuf.ModuleConfig.ModuleConfig["payloadVariant"];
type ConfigCase = NonNullable<ConfigVariant["case"]>;
type ModuleConfigCase = NonNullable<ModuleConfigVariant["case"]>;

export interface HeldSend {
  /** Resolves once the send is being held. */
  reached: Promise<void>;
  release(): void;
}

export interface AdminInterceptor {
  /** Every admin message sent, decoded, in order; a settings transaction is bracketed by begin/commit. */
  sent: Protobuf.Admin.AdminMessage[];
  cases(): (AdminCase | undefined)[];
  /** Holds the next send of `adminCase` (a transaction, for `commitEditSettings`) open until released. */
  hold(adminCase: AdminCase): HeldSend;
  /** Makes the next send carrying `adminCase` fail. */
  failNext(adminCase: AdminCase): void;
  sentConfig<K extends ConfigCase>(
    section: K,
  ): Extract<ConfigVariant, { case: K }> | undefined;
  sentModuleConfig<K extends ModuleConfigCase>(
    section: K,
  ): Extract<ModuleConfigVariant, { case: K }> | undefined;
}

const bracket = (adminCase: "beginEditSettings" | "commitEditSettings") =>
  create(Protobuf.Admin.AdminMessageSchema, {
    payloadVariant: { case: adminCase, value: true },
  });

/**
 * Watches the admin messages a fake facade client's local admin API is
 * given, so a test can see what a commit sent and hold or fail it.
 */
export function interceptAdmin(client: FakeKmpClient): AdminInterceptor {
  const admin = client.admin();
  const sent: Protobuf.Admin.AdminMessage[] = [];
  const holds: {
    adminCase: AdminCase;
    onReached: () => void;
    released: Promise<void>;
  }[] = [];
  const failures: AdminCase[] = [];

  const decode = (bytes: Uint8Array) =>
    fromBinary(Protobuf.Admin.AdminMessageSchema, bytes);

  async function gate(
    messages: Protobuf.Admin.AdminMessage[],
    terminal: AdminCase | undefined,
  ): Promise<AdminResultJs> {
    const cases = messages.map((m) => m.payloadVariant.case);
    const failure = failures.findIndex((c) => cases.includes(c));
    if (failure !== -1) {
      failures.splice(failure, 1);
      return { ok: false, reason: "send failed", value: null, text: null };
    }
    const held = holds.findIndex(
      (h) => cases.includes(h.adminCase) || h.adminCase === terminal,
    );
    if (held !== -1) {
      const [hold] = holds.splice(held, 1);
      if (hold) {
        hold.onReached();
        await hold.released;
      }
    }
    return adminOk();
  }

  admin.send = async (bytes) => {
    const message = decode(bytes);
    sent.push(message);
    return gate([message], undefined);
  };
  admin.editSettings = async (batch) => {
    const messages = batch.map(decode);
    sent.push(bracket("beginEditSettings"), ...messages);
    const result = await gate(messages, "commitEditSettings");
    sent.push(bracket("commitEditSettings"));
    return result;
  };

  return {
    sent,
    cases: () => sent.map((admin) => admin.payloadVariant.case),
    hold(adminCase) {
      let onReached = (): void => {};
      let release = (): void => {};
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
    sentConfig(section) {
      for (const admin of sent) {
        if (admin.payloadVariant.case !== "setConfig") continue;
        const variant = admin.payloadVariant.value.payloadVariant;
        const match = [variant].find(
          (v): v is Extract<ConfigVariant, { case: typeof section }> =>
            v.case === section,
        );
        if (match) return match;
      }
      return undefined;
    },
    sentModuleConfig(section) {
      for (const admin of sent) {
        if (admin.payloadVariant.case !== "setModuleConfig") continue;
        const variant = admin.payloadVariant.value.payloadVariant;
        const match = [variant].find(
          (v): v is Extract<ModuleConfigVariant, { case: typeof section }> =>
            v.case === section,
        );
        if (match) return match;
      }
      return undefined;
    },
  };
}
