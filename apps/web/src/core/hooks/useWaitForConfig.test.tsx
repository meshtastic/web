import { create } from "@bufbuild/protobuf";
import { CurrentDeviceContext } from "@core/hooks/useDeviceContext.ts";
import { useDeviceStore } from "@core/stores/deviceStore/index.ts";
import { Protobuf } from "@meshtastic/sdk";
import { act, renderHook } from "@testing-library/react";
import type { PropsWithChildren } from "react";
import { beforeEach, describe, expect, it } from "vitest";
import { useWaitForConfig } from "./useWaitForConfig.ts";

const DEVICE_ID = 4242;

const wrapper = ({ children }: PropsWithChildren) => (
  <CurrentDeviceContext.Provider value={{ deviceId: DEVICE_ID }}>
    {children}
  </CurrentDeviceContext.Provider>
);

describe("useWaitForConfig", () => {
  beforeEach(() => {
    useDeviceStore.getState().removeDevice(DEVICE_ID);
  });

  it("resolves its suspense promise when the requested config arrives", async () => {
    const device = useDeviceStore.getState().addDevice(DEVICE_ID);
    const { result } = renderHook(
      () => {
        try {
          useWaitForConfig({ configCase: "lora" });
          return "ready" as const;
        } catch (pending) {
          return pending as Promise<void>;
        }
      },
      { wrapper },
    );

    expect(result.current).toBeInstanceOf(Promise);
    const pending = result.current as Promise<void>;

    act(() => {
      device.setConfig(
        create(Protobuf.Config.ConfigSchema, {
          payloadVariant: {
            case: "lora",
            value: create(Protobuf.Config.Config_LoRaConfigSchema, {}),
          },
        }),
      );
    });

    const outcome = await Promise.race([
      pending.then(() => "resolved"),
      new Promise<string>((resolve) =>
        setTimeout(() => resolve("timed-out"), 50),
      ),
    ]);
    expect(outcome).toBe("resolved");
  });
});
