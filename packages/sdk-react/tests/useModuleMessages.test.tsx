import { act, renderHook, waitFor } from "@testing-library/react";
import { MeshClient, Protobuf } from "@meshtastic/sdk";
import { createFakeTransport } from "@meshtastic/sdk/testing";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MeshProvider, useCannedMessages, useRingtone } from "../mod.ts";
import { MODULE_MESSAGES_TIMEOUT_MS } from "../src/hooks/useModuleMessages.ts";

function setup() {
  const handle = createFakeTransport();
  const client = new MeshClient({ transport: handle.transport });
  const sendPacket = vi.spyOn(client, "sendPacket").mockResolvedValue(1);
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <MeshProvider client={client}>{children}</MeshProvider>
  );
  return { client, sendPacket, wrapper };
}

function answer(
  client: MeshClient,
  payloadVariant: Protobuf.Admin.AdminMessage["payloadVariant"],
) {
  client.events.onAdminPacket.dispatch({
    id: 2,
    rxTime: new Date(),
    type: "direct",
    from: client.myNodeNum,
    to: client.myNodeNum,
    channel: 0,
    // Only the fields the SDK reads; avoids a protobuf runtime dependency.
    data: {
      payloadVariant,
      sessionPasskey: new Uint8Array(),
    } as unknown as Protobuf.Admin.AdminMessage,
  });
}

describe("useCannedMessages / useRingtone", () => {
  afterEach(() => vi.useRealTimers());

  it("asks the device on mount and shows its answer", async () => {
    const { client, sendPacket, wrapper } = setup();
    const { result } = renderHook(() => useCannedMessages(), { wrapper });

    expect(result.current.isLoading).toBe(true);
    expect(result.current.value).toBeUndefined();
    expect(sendPacket).toHaveBeenCalledTimes(1);

    act(() =>
      answer(client, {
        case: "getCannedMessageModuleMessagesResponse",
        value: "Yes|No",
      }),
    );
    await waitFor(() => expect(result.current.value).toBe("Yes|No"));
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeUndefined();
  });

  it("stops loading when the answer repeats the cached value", async () => {
    const { client, wrapper } = setup();
    answer(client, { case: "getRingtoneResponse", value: "tone" });
    const { result } = renderHook(() => useRingtone(), { wrapper });
    expect(result.current.value).toBe("tone");
    expect(result.current.isLoading).toBe(true);

    act(() => answer(client, { case: "getRingtoneResponse", value: "tone" }));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
  });

  it("reports an error when the device doesn't answer", async () => {
    vi.useFakeTimers();
    const { wrapper } = setup();
    const { result } = renderHook(() => useRingtone(), { wrapper });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(MODULE_MESSAGES_TIMEOUT_MS);
    });
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeInstanceOf(Error);
  });

  it("reports an error when the request can't be sent", async () => {
    const { sendPacket, wrapper } = setup();
    sendPacket.mockRejectedValue(new Error("offline"));
    const { result } = renderHook(() => useRingtone(), { wrapper });
    await waitFor(() => expect(result.current.error?.message).toBe("offline"));
    expect(result.current.isLoading).toBe(false);
  });
});
