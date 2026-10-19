import { create } from "@bufbuild/protobuf";
import { renderSettingsForm } from "@app/tests/renderSettingsForm.tsx";
import { Protobuf } from "@meshtastic/sdk";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { MQTT } from "./MQTT.tsx";

// Protobuf omits default booleans on the wire, so these tests decode what was
// actually sent rather than trusting the editor's state.

const deviceMqtt = () =>
  create(Protobuf.ModuleConfig.ModuleConfigSchema, {
    payloadVariant: {
      case: "mqtt",
      value: create(Protobuf.ModuleConfig.ModuleConfig_MQTTConfigSchema, {
        enabled: false,
        address: "mqtt.example.org",
        username: "meshdev",
        password: "large4cats",
        root: "msh",
      }),
    },
  });

const renderMqtt = () =>
  renderSettingsForm(<MQTT onFormInit={() => {}} />, {
    moduleConfig: [deviceMqtt()],
  });

describe("MQTT module config", () => {
  it("puts `enabled: true` on the wire when the toggle is switched on", async () => {
    const { editor, radio } = renderMqtt();

    await userEvent.click(await screen.findByLabelText("MQTT Enabled"));
    await waitFor(() =>
      expect(editor.dirtyModuleSections.value).toContain("mqtt"),
    );
    expect((await editor.commit()).status).toBe("ok");

    const wire = radio.sentModuleConfig("mqtt");
    expect(wire?.enabled).toBe(true);
    // Fields the user didn't touch still round-trip.
    expect(wire?.address).toBe("mqtt.example.org");
    expect(wire?.username).toBe("meshdev");
    expect(wire?.password).toBe("large4cats");
    expect(wire?.root).toBe("msh");
  });

  it("keeps the toggle pending when it was flipped during another save", async () => {
    const { client, editor, radio } = renderMqtt();
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

    const held = radio.hold("commitEditSettings");
    const pending = editor.commit();
    await held.reached;

    await userEvent.click(await screen.findByLabelText("MQTT Enabled"));
    await waitFor(() =>
      expect(editor.dirtyModuleSections.value).toContain("mqtt"),
    );
    held.release();
    expect((await pending).status).toBe("ok");

    expect(radio.cases()).toEqual([
      "beginEditSettings",
      "setConfig",
      "commitEditSettings",
    ]);
    expect(editor.dirtyModuleSections.value).toContain("mqtt");

    expect((await editor.commit()).status).toBe("ok");
    expect(radio.sentModuleConfig("mqtt")?.enabled).toBe(true);
    expect(editor.isDirty.value).toBe(false);
  });
});
