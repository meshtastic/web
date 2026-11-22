import { create } from "@bufbuild/protobuf";
import { Protobuf } from "@core/protobuf.ts";
import { STAGED_FIXED_POSITION } from "@core/utils/stagedAdminKeys.ts";
import { describe, expect, it, vi } from "vitest";
import type { ImportPlan } from "./profileExport.ts";
import { importTarget, stageImportPlan } from "./profileImport.ts";

const Role = Protobuf.Channel.Channel_Role;

describe("importTarget", () => {
  it("lists the channels in use", () => {
    const owner = create(Protobuf.Mesh.UserSchema, { longName: "Me" });
    const target = importTarget({
      owner,
      security: undefined,
      channels: [
        create(Protobuf.Channel.ChannelSchema, {
          index: 0,
          role: Role.PRIMARY,
        }),
        create(Protobuf.Channel.ChannelSchema, {
          index: 1,
          role: Role.DISABLED,
        }),
        create(Protobuf.Channel.ChannelSchema, {
          index: 2,
          role: Role.SECONDARY,
        }),
      ],
    });
    expect(target).toEqual({
      owner,
      security: undefined,
      activeChannelIndexes: [0, 2],
    });
  });
});

describe("stageImportPlan", () => {
  const editor = () => ({
    setOwner: vi.fn(),
    setRadioSection: vi.fn(),
    setModuleSection: vi.fn(),
    setChannel: vi.fn(),
    stageAdminMessage: vi.fn(),
  });

  it("stages every part of the plan", () => {
    const lora = create(Protobuf.Config.Config_LoRaConfigSchema, {
      region: Protobuf.Config.Config_LoRaConfig_RegionCode.EU_868,
    });
    const mqtt = create(Protobuf.ModuleConfig.ModuleConfig_MQTTConfigSchema, {
      enabled: true,
    });
    const channel = create(Protobuf.Channel.ChannelSchema, {
      index: 0,
      role: Role.PRIMARY,
    });
    const owner = create(Protobuf.Mesh.UserSchema, { longName: "Me" });
    const plan: ImportPlan = {
      owner,
      radio: { lora },
      modules: { mqtt },
      channels: [channel],
      fixedPosition: create(Protobuf.Mesh.PositionSchema, { latitudeI: 1 }),
      skipped: [],
    };
    const stager = editor();
    stageImportPlan(stager, plan);

    expect(stager.setOwner).toHaveBeenCalledWith(owner);
    expect(stager.setRadioSection).toHaveBeenCalledExactlyOnceWith(
      "lora",
      lora,
    );
    expect(stager.setModuleSection).toHaveBeenCalledExactlyOnceWith(
      "mqtt",
      mqtt,
    );
    expect(stager.setChannel).toHaveBeenCalledWith(channel);
    expect(stager.stageAdminMessage).toHaveBeenCalledWith(
      STAGED_FIXED_POSITION,
      expect.objectContaining({
        payloadVariant: expect.objectContaining({ case: "setFixedPosition" }),
      }),
    );
  });

  it("stages nothing for an empty plan", () => {
    const stager = editor();
    stageImportPlan(stager, {
      radio: {},
      modules: {},
      channels: [],
      skipped: [],
    });
    for (const fn of Object.values(stager)) expect(fn).not.toHaveBeenCalled();
  });
});
