import { create, toBinary } from "@bufbuild/protobuf";
import { RemoteSectionBoundary } from "@components/Settings/RemoteSectionBoundary.tsx";
import { useWaitForConfig } from "@core/hooks/useWaitForConfig.ts";
import { AdminError } from "@core/kmp/admin.ts";
import { adminOk } from "@core/kmp/fakeClient.ts";
import { Protobuf } from "@core/protobuf.ts";
import {
  RemoteSettingsContext,
  type RemoteSettingsScope,
} from "@core/settings/remoteContext.ts";
import { RemoteSettings } from "@core/settings/remoteSettings.ts";
import { CurrentDeviceContext, type Device } from "@core/stores";
import { fireEvent, render, screen } from "@testing-library/react";
import type { AdminResultJs } from "@meshtastic/sdk-kmp";
import { Result } from "better-result";
import { describe, expect, it, vi } from "vitest";
import { remoteDevice, resolveRemoteTarget } from "./RemoteSettingsScope.tsx";

const KEY = new Uint8Array([1, 2, 3]);
const device = { adminAccessNodes: [0x0c40], adminAccessKey: "AQID" };

describe("resolveRemoteTarget", () => {
  const base = {
    node: 0x0c40 as number | undefined,
    connected: true,
    myNodeNum: 9 as number | undefined,
    localPublicKey: KEY as Uint8Array | undefined,
    device,
  };

  it("opens a node this radio manages", () => {
    expect(resolveRemoteTarget(base)).toEqual({
      kind: "remote",
      nodeNum: 0x0c40,
    });
  });

  it("falls back to local settings without a node, or for this radio", () => {
    expect(resolveRemoteTarget({ ...base, node: undefined })).toEqual({
      kind: "local",
    });
    expect(resolveRemoteTarget({ ...base, node: 9 })).toEqual({
      kind: "local",
    });
  });

  it("refuses a node it isn't set up for, or learned under another key", () => {
    expect(resolveRemoteTarget({ ...base, node: 0x0c41 })).toEqual({
      kind: "unavailable",
      nodeNum: 0x0c41,
      reason: "notSetUp",
    });
    expect(
      resolveRemoteTarget({ ...base, localPublicKey: new Uint8Array([7]) }),
    ).toEqual({ kind: "unavailable", nodeNum: 0x0c40, reason: "notSetUp" });
  });

  it("needs a radio, and waits for its keys", () => {
    expect(resolveRemoteTarget({ ...base, connected: false })).toEqual({
      kind: "unavailable",
      nodeNum: 0x0c40,
      reason: "noRadio",
    });
    expect(resolveRemoteTarget({ ...base, localPublicKey: undefined })).toEqual(
      { kind: "waiting" },
    );
    expect(
      resolveRemoteTarget({ ...base, localPublicKey: new Uint8Array(0) }),
    ).toEqual({ kind: "unavailable", nodeNum: 0x0c40, reason: "notSetUp" });
  });
});

describe("remoteDevice", () => {
  it("reads the remote node's config and never writes the store", () => {
    const setConfig = vi.fn();
    const setModuleConfig = vi.fn();
    const local = {
      config: create(Protobuf.LocalOnly.LocalConfigSchema, {
        lora: create(Protobuf.Config.Config_LoRaConfigSchema, { region: 1 }),
      }),
      moduleConfig: create(Protobuf.LocalOnly.LocalModuleConfigSchema),
      setConfig,
      setModuleConfig,
      setDialogOpen: vi.fn(),
    } as unknown as Device;
    const lora = create(Protobuf.Config.Config_LoRaConfigSchema, { region: 3 });
    const mqtt = create(Protobuf.ModuleConfig.ModuleConfig_MQTTConfigSchema, {
      enabled: true,
    });
    const metadata = create(Protobuf.Mesh.DeviceMetadataSchema, {
      firmwareVersion: "2.7.20",
    });
    const overlay = remoteDevice(local, { lora }, { mqtt }, metadata);

    expect(overlay.config.lora?.region).toBe(3);
    expect(overlay.config.device).toBeUndefined();
    expect(overlay.getEffectiveConfig("lora")?.region).toBe(3);
    expect(overlay.moduleConfig.mqtt?.enabled).toBe(true);
    expect(overlay.getEffectiveModuleConfig("serial")).toBeUndefined();
    expect(overlay.metadata.get(0)?.firmwareVersion).toBe("2.7.20");
    expect(overlay.setDialogOpen).toBe(local.setDialogOpen);

    overlay.setConfig(create(Protobuf.Config.ConfigSchema));
    overlay.setModuleConfig(create(Protobuf.ModuleConfig.ModuleConfigSchema));
    expect(setConfig).not.toHaveBeenCalled();
    expect(setModuleConfig).not.toHaveBeenCalled();
    expect(local.config.lora?.region).toBe(1);
  });
});

describe("a remote section", () => {
  const Lora = () => {
    useWaitForConfig({ configCase: "lora" });
    return <p>LoRa form</p>;
  };

  function mount(replies: Array<() => Result<AdminResultJs, Error>>) {
    const remote = new RemoteSettings(0x0c40, {
      sendAdmin: async () => replies.shift()?.() ?? Result.ok(adminOk()),
      editSettings: async () => Result.ok(undefined),
      onDisconnect: () => () => {},
    });
    const scope = {
      remote,
      name: "IB North",
      device: remoteDevice({} as Device, {}, {}, undefined),
    } as RemoteSettingsScope;
    render(
      <CurrentDeviceContext.Provider value={{ deviceId: 1 }}>
        <RemoteSettingsContext.Provider value={scope}>
          <RemoteSectionBoundary scope={scope}>
            <Lora />
          </RemoteSectionBoundary>
        </RemoteSettingsContext.Provider>
      </CurrentDeviceContext.Provider>,
    );
  }

  const lora = () =>
    Result.ok(
      adminOk(
        toBinary(
          Protobuf.Config.ConfigSchema,
          create(Protobuf.Config.ConfigSchema, {
            payloadVariant: {
              case: "lora",
              value: create(Protobuf.Config.Config_LoRaConfigSchema),
            },
          }),
        ),
      ),
    );

  it("loads behind a loading state", async () => {
    mount([lora]);
    expect(screen.getByRole("status")).toHaveTextContent(
      "Loading from IB North…",
    );
    expect(await screen.findByText("LoRa form")).toBeInTheDocument();
  });

  it("says when the node doesn't answer, and tries again", async () => {
    mount([() => Result.err(new AdminError("NO_ROUTE")), lora]);
    expect(await screen.findByText("No answer from IB North")).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByText("LoRa form")).toBeInTheDocument();
  });

  it("says when the node refuses this radio, without a retry", async () => {
    mount([() => Result.err(new AdminError("unauthorized"))]);
    expect(
      await screen.findByText("IB North refused this radio"),
    ).toBeVisible();
    expect(screen.queryByRole("button", { name: "Try again" })).toBeNull();
  });
});
