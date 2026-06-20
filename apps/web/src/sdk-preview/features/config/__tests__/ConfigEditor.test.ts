import { create } from "@bufbuild/protobuf";
import { Protobuf, Types } from "@meshtastic/core";
import { Result } from "better-result";
import { describe, expect, it } from "vitest";
import type { MeshClientPort, Subscribable } from "../../../core/index.ts";
import { ConfigEditor } from "../domain/ConfigEditor.ts";

/** Controllable in-test emitter satisfying `Subscribable<T>`. */
function emitter<T>(): Subscribable<T> & { emit: (value: T) => void } {
  const listeners = new Set<(value: T) => void>();
  return {
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    emit(value) {
      for (const listener of [...listeners]) {
        listener(value);
      }
    },
  };
}

function makePort() {
  const onConfigPacket = emitter<Protobuf.Config.Config>();
  const onModuleConfigPacket = emitter<Protobuf.ModuleConfig.ModuleConfig>();
  const onDeviceStatus = emitter<Types.DeviceStatusEnum>();
  const calls: string[] = [];
  const port: MeshClientPort = {
    events: { onConfigPacket, onModuleConfigPacket, onDeviceStatus },
    setConfig: (config) => {
      calls.push(`setConfig:${config.payloadVariant.case}`);
      return Promise.resolve(1);
    },
    setModuleConfig: (moduleConfig) => {
      calls.push(`setModuleConfig:${moduleConfig.payloadVariant.case}`);
      return Promise.resolve(1);
    },
    beginEditSettings: () => {
      calls.push("begin");
      return Promise.resolve(1);
    },
    commitEditSettings: () => {
      calls.push("commit");
      return Promise.resolve(1);
    },
  };
  return { port, onConfigPacket, onModuleConfigPacket, onDeviceStatus, calls };
}

const loraConfig = (hopLimit: number): Protobuf.Config.Config =>
  create(Protobuf.Config.ConfigSchema, {
    payloadVariant: {
      case: "lora",
      value: create(Protobuf.Config.Config_LoRaConfigSchema, { hopLimit }),
    },
  });

const lora = (hopLimit: number) =>
  create(Protobuf.Config.Config_LoRaConfigSchema, { hopLimit });

const trafficModuleConfig = (
  enabled: boolean,
): Protobuf.ModuleConfig.ModuleConfig =>
  create(Protobuf.ModuleConfig.ModuleConfigSchema, {
    payloadVariant: {
      case: "trafficManagement",
      value: create(
        Protobuf.ModuleConfig.ModuleConfig_TrafficManagementConfigSchema,
        { enabled },
      ),
    },
  });

describe("ConfigEditor (sdk-preview)", () => {
  it("hydrates baseline + working from an inbound config packet without becoming dirty", () => {
    const { port, onConfigPacket } = makePort();
    const editor = new ConfigEditor(port);

    onConfigPacket.emit(loraConfig(3));

    expect(editor.radio.peek().lora?.hopLimit).toBe(3);
    expect(editor.isDirty.peek()).toBe(false);
    expect(editor.dirtyRadioSections.peek()).toEqual([]);
  });

  it("marks a section dirty when edited", () => {
    const { port, onConfigPacket } = makePort();
    const editor = new ConfigEditor(port);

    onConfigPacket.emit(loraConfig(3));
    editor.setRadioSection("lora", lora(5));

    expect(editor.isDirty.peek()).toBe(true);
    expect(editor.dirtyRadioSections.peek()).toEqual(["lora"]);
  });

  it("does not clobber a dirty section when a competing baseline packet arrives", () => {
    const { port, onConfigPacket } = makePort();
    const editor = new ConfigEditor(port);

    onConfigPacket.emit(loraConfig(3));
    editor.setRadioSection("lora", lora(5));
    onConfigPacket.emit(loraConfig(7)); // device pushes a different value mid-edit

    expect(editor.radio.peek().lora?.hopLimit).toBe(5); // user edit preserved
    expect(editor.isDirty.peek()).toBe(true);
  });

  it("commits dirty sections inside a begin/…/commit envelope and clears dirty", async () => {
    const { port, onConfigPacket, calls } = makePort();
    const editor = new ConfigEditor(port);

    onConfigPacket.emit(loraConfig(3));
    editor.setRadioSection("lora", lora(5));
    const result = await editor.commit();

    expect(Result.isError(result)).toBe(false);
    expect(calls).toEqual(["begin", "setConfig:lora", "commit"]);
    expect(editor.isDirty.peek()).toBe(false);
    expect(editor.radio.peek().lora?.hopLimit).toBe(5); // baseline now equals working
  });

  it("supports firmware-current module sections (trafficManagement) end to end", async () => {
    const { port, onModuleConfigPacket, calls } = makePort();
    const editor = new ConfigEditor(port);

    onModuleConfigPacket.emit(trafficModuleConfig(false));
    editor.setModuleSection(
      "trafficManagement",
      create(Protobuf.ModuleConfig.ModuleConfig_TrafficManagementConfigSchema, {
        enabled: true,
      }),
    );

    expect(editor.dirtyModuleSections.peek()).toEqual(["trafficManagement"]);
    const result = await editor.commit();
    expect(Result.isError(result)).toBe(false);
    expect(calls).toEqual([
      "begin",
      "setModuleConfig:trafficManagement",
      "commit",
    ]);
  });

  it("reset() discards working edits back to baseline", () => {
    const { port, onConfigPacket } = makePort();
    const editor = new ConfigEditor(port);

    onConfigPacket.emit(loraConfig(3));
    editor.setRadioSection("lora", lora(9));
    editor.reset();

    expect(editor.radio.peek().lora?.hopLimit).toBe(3);
    expect(editor.isDirty.peek()).toBe(false);
  });

  it("clears all state on disconnect", () => {
    const { port, onConfigPacket, onDeviceStatus } = makePort();
    const editor = new ConfigEditor(port);

    onConfigPacket.emit(loraConfig(3));
    editor.setRadioSection("lora", lora(5));
    onDeviceStatus.emit(Types.DeviceStatusEnum.DeviceDisconnected);

    expect(editor.radio.peek()).toEqual({});
    expect(editor.isDirty.peek()).toBe(false);
  });
});
