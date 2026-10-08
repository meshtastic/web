import { create, fromBinary } from "@bufbuild/protobuf";
import { CurrentDeviceContext, useDeviceStore } from "@core/stores";
import { MeshClient, MeshRegistry, Protobuf } from "@meshtastic/sdk";
import { createFakeTransport } from "@meshtastic/sdk/testing";
import { MeshRegistryProvider } from "@meshtastic/sdk-react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Suspense } from "react";
import { describe, expect, it } from "vitest";
import { MQTT } from "./MQTT.tsx";

/**
 * End-to-end cover for the MQTT module-config save path: the real settings
 * form -> `ConfigEditor` staging -> the AdminMessage bytes that go to the
 * radio.
 *
 * The assertions decode the outgoing packet from its wire encoding, because
 * protobuf omits default booleans: if `enabled` is not genuinely `true` when
 * the message is serialised, field 1 is simply absent from the bytes and the
 * device silently keeps MQTT switched off — which is exactly the bug this
 * covers.
 */

let deviceIdSeq = 100;

function setup(mqtt: Protobuf.ModuleConfig.ModuleConfig_MQTTConfig) {
  const { transport } = createFakeTransport();
  const registry = new MeshRegistry();
  const client = new MeshClient({ transport });
  const connectionId = deviceIdSeq++;
  registry.register(connectionId, client);
  registry.setActive(connectionId);

  const sent: Protobuf.Admin.AdminMessage[] = [];
  let release: (() => void) | undefined;
  let gate: Protobuf.Admin.AdminMessage["payloadVariant"]["case"] | undefined;

  client.sendPacket = (async (payload: Uint8Array) => {
    const admin = fromBinary(Protobuf.Admin.AdminMessageSchema, payload);
    sent.push(admin);
    if (gate && admin.payloadVariant.case === gate) {
      gate = undefined;
      await new Promise<void>((resolve) => {
        release = resolve;
      });
    }
    return 1;
  }) as never;

  const packet = create(Protobuf.ModuleConfig.ModuleConfigSchema, {
    payloadVariant: { case: "mqtt", value: mqtt },
  });
  const device = useDeviceStore.getState().addDevice(connectionId);
  device.setModuleConfig(packet);
  client.events.onModuleConfigPacket.dispatch(packet);

  render(
    <CurrentDeviceContext.Provider value={{ deviceId: connectionId }}>
      <MeshRegistryProvider registry={registry}>
        <Suspense fallback={<div>loading</div>}>
          <MQTT onFormInit={() => {}} />
        </Suspense>
      </MeshRegistryProvider>
    </CurrentDeviceContext.Provider>,
  );

  return {
    client,
    editor: client.config.editor,
    sent,
    gateOn: (
      value: Protobuf.Admin.AdminMessage["payloadVariant"]["case"],
    ): void => {
      gate = value;
    },
    release: () => release?.(),
  };
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

const deviceMqtt = () =>
  create(Protobuf.ModuleConfig.ModuleConfig_MQTTConfigSchema, {
    enabled: false,
    address: "mqtt.example.org",
    username: "meshdev",
    password: "large4cats",
    root: "msh",
  });

describe("MQTT module config", () => {
  it("puts `enabled: true` on the wire when the toggle is switched on", async () => {
    const { editor, sent } = setup(deviceMqtt());

    await userEvent.click(await screen.findByLabelText("Enabled"));

    await waitFor(() =>
      expect(editor.dirtyModuleSections.value).toContain("mqtt"),
    );
    expect((await editor.commit()).status).toBe("ok");

    const wire = mqttFromWire(sent);
    expect(wire).toBeDefined();
    expect(wire?.enabled).toBe(true);
    // The text fields the user did not touch must still round-trip.
    expect(wire?.address).toBe("mqtt.example.org");
    expect(wire?.username).toBe("meshdev");
    expect(wire?.password).toBe("large4cats");
    expect(wire?.root).toBe("msh");
  });

  it("does not report the toggle as saved when it was not part of the commit", async () => {
    const { client, editor, sent, gateOn, release } = setup(deviceMqtt());

    client.events.onConfigPacket.dispatch(
      create(Protobuf.Config.ConfigSchema, {
        payloadVariant: {
          case: "lora",
          value: create(Protobuf.Config.Config_LoRaConfigSchema, { region: 1 }),
        },
      }),
    );
    editor.setRadioSection(
      "lora",
      create(Protobuf.Config.Config_LoRaConfigSchema, { region: 4 }),
    );

    // Start an unrelated save and hold it open on the closing commitEditSettings.
    gateOn("commitEditSettings");
    const pending = editor.commit();
    await new Promise((resolve) => setTimeout(resolve, 0));

    // The user flips "MQTT enabled" while that save is still in flight.
    await userEvent.click(await screen.findByLabelText("Enabled"));
    await waitFor(() =>
      expect(editor.dirtyModuleSections.value).toContain("mqtt"),
    );

    release();
    expect((await pending).status).toBe("ok");

    // The transaction really did open and commit on the device, but it never
    // carried the MQTT payload — so the edit has to stay pending.
    expect(sent.map((a) => a.payloadVariant.case)).toEqual([
      "beginEditSettings",
      "setConfig",
      "commitEditSettings",
    ]);
    expect(mqttFromWire(sent)).toBeUndefined();
    expect(editor.dirtyModuleSections.value).toContain("mqtt");
    expect(editor.isDirty.value).toBe(true);

    // The next save carries it, with `enabled` intact.
    expect((await editor.commit()).status).toBe("ok");
    expect(mqttFromWire(sent)?.enabled).toBe(true);
    expect(editor.isDirty.value).toBe(false);
  });
});
