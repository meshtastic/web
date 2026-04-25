import { create } from "@bufbuild/protobuf";
import * as Protobuf from "@meshtastic/protobufs";
import { ChannelNumber, MeshRegistry } from "@meshtastic/sdk";
import { createFakeTransport } from "@meshtastic/sdk/testing";
import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MeshRegistryProvider, useChannels, useMeshDevice, useNode, useNodes } from "../mod.ts";

function makeRegistry(deviceCount: number) {
  const registry = new MeshRegistry();
  const handles: ReturnType<typeof createFakeTransport>[] = [];
  for (let i = 0; i < deviceCount; i++) {
    const handle = createFakeTransport();
    handles.push(handle);
    registry.create(i + 1, { transport: handle.transport });
  }
  return { registry, handles };
}

describe("sdk-react under MeshRegistryProvider", () => {
  it("useMeshDevice resolves through the registry's active client", async () => {
    const { registry, handles } = makeRegistry(1);
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <MeshRegistryProvider registry={registry}>{children}</MeshRegistryProvider>
    );
    const { result } = renderHook(() => useMeshDevice(), { wrapper });
    expect(result.current.myNodeNum).toBeUndefined();

    await act(async () => {
      handles[0]!.respond.withMyNodeInfo({ myNodeNum: 555 });
      await new Promise((r) => setTimeout(r, 10));
    });
    await waitFor(() => expect(result.current.myNodeNum).toBe(555));
  });

  it("useNodes lists nodes from the active client and updates on packets", async () => {
    const { registry, handles } = makeRegistry(1);
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <MeshRegistryProvider registry={registry}>{children}</MeshRegistryProvider>
    );
    const { result } = renderHook(() => useNodes(), { wrapper });
    expect(result.current).toEqual([]);

    await act(async () => {
      handles[0]!.respond.withNodeInfo({ num: 7 });
      await new Promise((r) => setTimeout(r, 10));
    });
    await waitFor(() => {
      expect(result.current.map((n) => n.num)).toEqual([7]);
    });
  });

  it("useNode selects by node number and re-renders on update", async () => {
    const { registry, handles } = makeRegistry(1);
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <MeshRegistryProvider registry={registry}>{children}</MeshRegistryProvider>
    );
    const { result } = renderHook(() => useNode(11), { wrapper });
    expect(result.current).toBeUndefined();

    await act(async () => {
      handles[0]!.respond.withNodeInfo({ num: 11, isFavorite: true });
      await new Promise((r) => setTimeout(r, 10));
    });
    await waitFor(() => {
      expect(result.current?.isFavorite).toBe(true);
    });
  });

  it("useChannels reflects channel packets dispatched on the active client", async () => {
    const { registry } = makeRegistry(1);
    const client = registry.active.value;
    if (!client) throw new Error("expected an active client");

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <MeshRegistryProvider registry={registry}>{children}</MeshRegistryProvider>
    );
    const { result } = renderHook(() => useChannels(), { wrapper });
    expect(result.current).toEqual([]);

    await act(async () => {
      client.events.onChannelPacket.dispatch(
        create(Protobuf.Channel.ChannelSchema, {
          index: 0,
          role: Protobuf.Channel.Channel_Role.PRIMARY,
        }),
      );
    });
    await waitFor(() => {
      expect(result.current.length).toBe(1);
    });
  });

  it("switches active client and re-renders against the new device", async () => {
    const { registry, handles } = makeRegistry(2);

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <MeshRegistryProvider registry={registry}>{children}</MeshRegistryProvider>
    );
    const { result } = renderHook(() => useMeshDevice(), { wrapper });

    await act(async () => {
      handles[0]!.respond.withMyNodeInfo({ myNodeNum: 1 });
      handles[1]!.respond.withMyNodeInfo({ myNodeNum: 2 });
      await new Promise((r) => setTimeout(r, 10));
    });
    await waitFor(() => expect(result.current.myNodeNum).toBe(1));

    await act(async () => {
      registry.setActive(2);
    });
    await waitFor(() => expect(result.current.myNodeNum).toBe(2));
  });

  it("ChannelNumber enum exported as a value", () => {
    expect(ChannelNumber.Primary).toBe(0);
  });
});
