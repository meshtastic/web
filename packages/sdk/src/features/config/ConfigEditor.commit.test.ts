import { create, fromBinary } from "@bufbuild/protobuf";
import * as Protobuf from "@meshtastic/protobufs";
import { describe, expect, it } from "vitest";
import { MeshClient } from "../../core/client/MeshClient.ts";
import { createFakeTransport } from "../../core/testing/createFakeTransport.ts";

/**
 * Regression coverage for the "the device committed, but the value never went
 * out" class of bug.
 *
 * `ConfigEditor.commit()` used to read the dirty lists lazily (interleaved
 * with network round-trips) and then blanket-overwrite the baseline with the
 * whole working copy and clear *every* dirty flag. Anything staged while the
 * transaction was in flight was therefore folded into the baseline and marked
 * synced without ever having been transmitted: the daemon logged a genuine
 * beginEditSettings/commitEditSettings pair (and rewrote its config file), the
 * UI showed no pending changes, and the field silently never reached the
 * radio.
 */

interface Harness {
  client: MeshClient;
  editor: MeshClient["config"]["editor"];
  /** Decoded admin messages, in transmission order. */
  sent: Protobuf.Admin.AdminMessage[];
  /** Resolves the in-flight admin send whose case matches `gate`. */
  release(): void;
}

function createHarness(
  gate?: Protobuf.Admin.AdminMessage["payloadVariant"]["case"],
): Harness {
  const { transport } = createFakeTransport();
  const client = new MeshClient({ transport });
  const sent: Protobuf.Admin.AdminMessage[] = [];
  let release: (() => void) | undefined;
  // The gate only holds the first matching message, so a follow-up commit in
  // the same test runs to completion.
  let gated = gate !== undefined;

  client.sendPacket = (async (payload: Uint8Array) => {
    // Decode from the wire bytes, so the assertions see exactly what the
    // device would see (protobuf omits default booleans, so a missing
    // `enabled` here is a missing `enabled` on the radio).
    const admin = fromBinary(Protobuf.Admin.AdminMessageSchema, payload);
    sent.push(admin);
    if (gated && admin.payloadVariant.case === gate) {
      gated = false;
      await new Promise<void>((resolve) => {
        release = resolve;
      });
    }
    return 1;
  }) as never;

  return {
    client,
    editor: client.config.editor,
    sent,
    release: () => release?.(),
  };
}

function summarise(sent: Protobuf.Admin.AdminMessage[]): string[] {
  return sent.map((admin) => {
    const variant = admin.payloadVariant;
    switch (variant.case) {
      case "setConfig":
        return `setConfig:${variant.value.payloadVariant.case}`;
      case "setModuleConfig":
        return `setModuleConfig:${variant.value.payloadVariant.case}`;
      default:
        return String(variant.case);
    }
  });
}

function mqttFromWire(
  sent: Protobuf.Admin.AdminMessage[],
): Protobuf.ModuleConfig.ModuleConfig_MQTTConfig | undefined {
  for (const admin of sent) {
    const variant = admin.payloadVariant;
    if (variant.case !== "setModuleConfig") continue;
    const module = variant.value.payloadVariant;
    if (module.case === "mqtt") return module.value;
  }
  return undefined;
}

function mqttPacket(
  init: Partial<{ enabled: boolean; address: string; username: string }>,
): Protobuf.ModuleConfig.ModuleConfig {
  return create(Protobuf.ModuleConfig.ModuleConfigSchema, {
    payloadVariant: {
      case: "mqtt",
      value: create(Protobuf.ModuleConfig.ModuleConfig_MQTTConfigSchema, init),
    },
  });
}

function loraPacket(region: number): Protobuf.Config.Config {
  return create(Protobuf.Config.ConfigSchema, {
    payloadVariant: {
      case: "lora",
      value: create(Protobuf.Config.Config_LoRaConfigSchema, { region }),
    },
  });
}

/**
 * What the web MQTT form hands to `setModuleSection`: a plain object produced
 * by the Zod resolver, so no `$typeName` and no protobuf prototype.
 */
function stagedMqttForm(enabled: boolean) {
  return {
    enabled,
    address: "mqtt.example.org",
    username: "meshdev",
    password: "large4cats",
    encryptionEnabled: false,
    jsonEnabled: false,
    tlsEnabled: false,
    root: "msh",
    proxyToClientEnabled: false,
    mapReportingEnabled: false,
  };
}

describe("ConfigEditor.commit() payload", () => {
  it("transmits the MQTT `enabled` boolean the form staged", async () => {
    const { client, editor, sent } = createHarness();
    client.events.onModuleConfigPacket.dispatch(
      mqttPacket({ enabled: false, address: "mqtt.example.org" }),
    );

    editor.setModuleSection("mqtt", stagedMqttForm(true) as never);
    expect(editor.dirtyModuleSections.value).toEqual(["mqtt"]);

    const result = await editor.commit();
    expect(result.status).toBe("ok");

    // `enabled` must survive protobuf encoding — protobuf drops default
    // booleans, so decoding it back off the wire proves it was really set.
    expect(mqttFromWire(sent)?.enabled).toBe(true);
    expect(summarise(sent)).toEqual([
      "beginEditSettings",
      "setModuleConfig:mqtt",
      "commitEditSettings",
    ]);
  });

  it("keeps an edit staged during an in-flight commit pending instead of marking it synced", async () => {
    const harness = createHarness("commitEditSettings");
    const { client, editor, sent } = harness;

    client.events.onConfigPacket.dispatch(loraPacket(1));
    client.events.onModuleConfigPacket.dispatch(mqttPacket({ enabled: false }));

    // The user saves an unrelated LoRa change...
    editor.setRadioSection(
      "lora",
      create(Protobuf.Config.Config_LoRaConfigSchema, { region: 4 }),
    );
    const pending = editor.commit();
    await new Promise((resolve) => setTimeout(resolve, 0));

    // ...and toggles "MQTT enabled" on while that save is still round-tripping.
    editor.setModuleSection("mqtt", stagedMqttForm(true) as never);
    expect(editor.dirtyModuleSections.value).toEqual(["mqtt"]);

    harness.release();
    expect((await pending).status).toBe("ok");

    // The MQTT edit was never part of this transaction...
    expect(summarise(sent)).toEqual([
      "beginEditSettings",
      "setConfig:lora",
      "commitEditSettings",
    ]);
    expect(mqttFromWire(sent)).toBeUndefined();
    // ...so it must still be pending, not silently laundered as "saved".
    expect(editor.dirtyModuleSections.value).toEqual(["mqtt"]);
    expect(editor.isDirty.value).toBe(true);

    // And it goes out on the next commit, with `enabled` intact.
    expect((await editor.commit()).status).toBe("ok");
    expect(mqttFromWire(sent)?.enabled).toBe(true);
    expect(editor.dirtyModuleSections.value).toEqual([]);
    expect(editor.isDirty.value).toBe(false);
  });

  it("committing one section leaves an unrelated section's edit dirty", async () => {
    const harness = createHarness("beginEditSettings");
    const { client, editor, sent } = harness;

    client.events.onConfigPacket.dispatch(loraPacket(1));
    client.events.onModuleConfigPacket.dispatch(mqttPacket({ enabled: false }));

    // Only LoRa is staged when the commit starts.
    editor.setRadioSection(
      "lora",
      create(Protobuf.Config.Config_LoRaConfigSchema, { region: 4 }),
    );
    const pending = editor.commit();
    await new Promise((resolve) => setTimeout(resolve, 0));

    // MQTT is staged after the payload was frozen, so it is not in this commit.
    editor.setModuleSection("mqtt", stagedMqttForm(true) as never);

    harness.release();
    expect((await pending).status).toBe("ok");

    expect(summarise(sent)).not.toContain("setModuleConfig:mqtt");
    expect(editor.dirtyRadioSections.value).toEqual([]);
    expect(editor.dirtyModuleSections.value).toEqual(["mqtt"]);
    expect(editor.modules.value.mqtt?.enabled).toBe(true);
  });

  it("re-staging a section mid-flight keeps it dirty so the newer value is sent", async () => {
    const harness = createHarness("commitEditSettings");
    const { client, editor, sent } = harness;

    client.events.onModuleConfigPacket.dispatch(mqttPacket({ enabled: false }));

    editor.setModuleSection("mqtt", stagedMqttForm(true) as never);
    const pending = editor.commit();
    await new Promise((resolve) => setTimeout(resolve, 0));

    // The user turns it back off before the transaction completes.
    editor.setModuleSection("mqtt", stagedMqttForm(false) as never);

    harness.release();
    expect((await pending).status).toBe("ok");

    expect(mqttFromWire(sent)?.enabled).toBe(true);
    // The newer (off) value was never transmitted, so it is still pending.
    expect(editor.dirtyModuleSections.value).toEqual(["mqtt"]);
  });

  it("does not open an empty begin/commit transaction", async () => {
    const { client, editor, sent } = createHarness();
    client.events.onModuleConfigPacket.dispatch(
      mqttPacket({ enabled: true, address: "mqtt.example.org" }),
    );

    // A section that is dirty only because the baseline has a value the
    // working copy lost cannot be transmitted; opening a transaction for it
    // would make the device rewrite its config unchanged and report success.
    editor.setModuleSection("mqtt", undefined as never);
    expect(editor.isDirty.value).toBe(true);

    const result = await editor.commit();
    expect(result.status).toBe("ok");
    expect(sent).toEqual([]);
    // Still pending — nothing was sent, so nothing may be marked synced.
    expect(editor.dirtyModuleSections.value).toEqual(["mqtt"]);
  });

  it("does not mark a skipped section synced when another section is sent", async () => {
    const { client, editor, sent } = createHarness();
    client.events.onConfigPacket.dispatch(loraPacket(1));
    client.events.onModuleConfigPacket.dispatch(
      mqttPacket({ enabled: true, address: "mqtt.example.org" }),
    );

    editor.setRadioSection(
      "lora",
      create(Protobuf.Config.Config_LoRaConfigSchema, { region: 4 }),
    );
    editor.setModuleSection("mqtt", undefined as never);

    expect((await editor.commit()).status).toBe("ok");

    expect(summarise(sent)).toEqual([
      "beginEditSettings",
      "setConfig:lora",
      "commitEditSettings",
    ]);
    expect(editor.dirtyRadioSections.value).toEqual([]);
    expect(editor.dirtyModuleSections.value).toEqual(["mqtt"]);
  });
});

describe("ConfigEditor dirty tracking", () => {
  it("does not flag a staged form object that matches the device", () => {
    const { client, editor } = createHarness();
    client.events.onModuleConfigPacket.dispatch(
      mqttPacket({ enabled: false, address: "mqtt.example.org" }),
    );

    // Re-saving the form without touching anything must not look like a change
    // just because the form stages a plain object rather than a protobuf
    // message.
    editor.setModuleSection("mqtt", {
      enabled: false,
      address: "mqtt.example.org",
    } as never);

    expect(editor.dirtyModuleSections.value).toEqual([]);
    expect(editor.isDirty.value).toBe(false);
  });

  it("lets inbound device config refresh a section that is no longer really dirty", () => {
    const { client, editor } = createHarness();
    client.events.onModuleConfigPacket.dispatch(
      mqttPacket({ enabled: false, address: "mqtt.example.org" }),
    );
    editor.setModuleSection("mqtt", {
      enabled: false,
      address: "mqtt.example.org",
    } as never);

    // Previously this section stayed dirty forever (plain object vs protobuf
    // message never compared equal), so the editor refused to apply device
    // updates and the UI kept showing the stale staged value.
    client.events.onModuleConfigPacket.dispatch(
      mqttPacket({ enabled: true, address: "mqtt.example.org" }),
    );

    expect(editor.dirtyModuleSections.value).toEqual([]);
    expect(editor.modules.value.mqtt?.enabled).toBe(true);
  });
});
