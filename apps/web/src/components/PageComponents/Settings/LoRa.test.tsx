import { create, fromBinary } from "@bufbuild/protobuf";
import { CurrentDeviceContext, useDeviceStore } from "@core/stores";
import { MeshClient, MeshRegistry, Protobuf } from "@meshtastic/sdk";
import { createFakeTransport } from "@meshtastic/sdk/testing";
import { MeshRegistryProvider } from "@meshtastic/sdk-react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Suspense } from "react";
import { describe, expect, it } from "vitest";
import { LoRa } from "./LoRa.tsx";

/**
 * End-to-end cover for the radio/LoRa save path: the real form -> the Zod
 * resolver -> `ConfigEditor` staging -> the AdminMessage bytes.
 *
 * The regression these guard against: `LoRaValidationSchema` required
 * `serialHalOnly`, a protobuf field the bindings the app actually loads
 * (`@meshtastic/sdk` -> `@meshtastic/protobufs`) do not necessarily have. The
 * device's own LoRaConfig therefore failed validation on a field nobody
 * touched, `DynamicForm`'s auto-save (`handleSubmit`) dropped every submit,
 * and *no* LoRa change — region, Ok to MQTT, TX power — was ever staged, let
 * alone transmitted. Nothing in the UI said so.
 */

let deviceIdSeq = 700;

function deviceLora() {
  return create(Protobuf.Config.Config_LoRaConfigSchema, {
    usePreset: true,
    modemPreset: 0,
    region: 3,
    hopLimit: 3,
    txEnabled: true,
    txPower: 27,
    channelNum: 20,
    sx126xRxBoostedGain: true,
    configOkToMqtt: false,
  });
}

function setup(lora: Protobuf.Config.Config_LoRaConfig) {
  const { transport } = createFakeTransport();
  const registry = new MeshRegistry();
  const client = new MeshClient({ transport });
  const connectionId = deviceIdSeq++;
  registry.register(connectionId, client);
  registry.setActive(connectionId);

  const sent: Protobuf.Admin.AdminMessage[] = [];
  client.sendPacket = (async (payload: Uint8Array) => {
    sent.push(fromBinary(Protobuf.Admin.AdminMessageSchema, payload));
    return 1;
  }) as never;

  const packet = create(Protobuf.Config.ConfigSchema, {
    payloadVariant: { case: "lora", value: lora },
  });
  const device = useDeviceStore.getState().addDevice(connectionId);
  device.setConfig(packet);
  client.events.onConfigPacket.dispatch(packet);

  render(
    <CurrentDeviceContext.Provider value={{ deviceId: connectionId }}>
      <MeshRegistryProvider registry={registry}>
        <Suspense fallback={<div>loading</div>}>
          <LoRa onFormInit={() => {}} />
        </Suspense>
      </MeshRegistryProvider>
    </CurrentDeviceContext.Provider>,
  );

  return { client, editor: client.config.editor, sent };
}

function loraFromWire(
  sent: Protobuf.Admin.AdminMessage[],
): Protobuf.Config.Config_LoRaConfig | undefined {
  for (const admin of sent) {
    if (admin.payloadVariant.case !== "setConfig") continue;
    const variant = admin.payloadVariant.value.payloadVariant;
    if (variant.case === "lora") return variant.value;
  }
  return undefined;
}

describe("LoRa config", () => {
  it("puts `configOkToMqtt: true` on the wire when 'Ok to MQTT' is switched on", async () => {
    const { editor, sent } = setup(deviceLora());

    await userEvent.click(await screen.findByLabelText("Ok to MQTT"));

    await waitFor(() =>
      expect(editor.dirtyRadioSections.value).toContain("lora"),
    );
    expect((await editor.commit()).status).toBe("ok");

    const wire = loraFromWire(sent);
    expect(wire).toBeDefined();
    // Field 105 is a proto3 bool: `false` is absent from the encoding, so
    // decoding `true` back off the wire is the only real proof.
    expect(wire?.configOkToMqtt).toBe(true);
    // Everything the user did not touch must survive the round-trip.
    expect(wire?.region).toBe(3);
    expect(wire?.txPower).toBe(27);
    expect(wire?.hopLimit).toBe(3);
    expect(wire?.channelNum).toBe(20);
    expect(wire?.sx126xRxBoostedGain).toBe(true);
    expect(wire?.usePreset).toBe(true);
  });

  it("stages a LoRa change even when the device predates a schema field", async () => {
    // `serialHalOnly` is absent from the message the device sent (older
    // bindings). The form must still save.
    const lora = deviceLora();
    expect(
      (lora as unknown as Record<string, unknown>).serialHalOnly,
    ).toBeUndefined();

    const { editor, sent } = setup(lora);

    await userEvent.click(await screen.findByLabelText("Transmit Enabled"));

    await waitFor(() =>
      expect(editor.dirtyRadioSections.value).toContain("lora"),
    );
    expect((await editor.commit()).status).toBe("ok");
    expect(loraFromWire(sent)?.txEnabled).toBe(false);
  });
});
