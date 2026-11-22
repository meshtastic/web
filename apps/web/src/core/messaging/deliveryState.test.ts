import { MessageState } from "@core/storage/types.ts";
import { describe, expect, it } from "vitest";
import { deriveDeliveryState, isRetryable } from "./deliveryState.ts";

describe("deriveDeliveryState", () => {
  describe("direct messages", () => {
    it.each([
      [MessageState.Pending, { kind: "pending", relayed: false }],
      [MessageState.Delivered, { kind: "pending", relayed: true }],
      [MessageState.Ack, { kind: "delivered" }],
      [MessageState.Failed, { kind: "failed" }],
    ])("%s", (state, expected) => {
      expect(deriveDeliveryState({ state, type: "direct", relays: 2 })).toEqual(
        expected,
      );
    });
  });

  describe("channel messages", () => {
    it("shows how many nodes relayed it", () => {
      expect(
        deriveDeliveryState({
          state: MessageState.Delivered,
          type: "broadcast",
          relays: 4,
        }),
      ).toEqual({ kind: "heardBy", count: 4 });
      expect(
        deriveDeliveryState({
          state: MessageState.Ack,
          type: "broadcast",
          relays: 1,
        }),
      ).toEqual({ kind: "heardBy", count: 1 });
    });

    it("falls back to delivered without a relay count", () => {
      expect(
        deriveDeliveryState({
          state: MessageState.Delivered,
          type: "broadcast",
        }),
      ).toEqual({ kind: "delivered" });
      expect(
        deriveDeliveryState({
          state: MessageState.Delivered,
          type: "broadcast",
          relays: 0,
        }),
      ).toEqual({ kind: "delivered" });
    });

    it("clamps a negative relay count", () => {
      expect(
        deriveDeliveryState({
          state: MessageState.Delivered,
          type: "broadcast",
          relays: -3,
        }),
      ).toEqual({ kind: "delivered" });
    });

    it("keeps pending and failed", () => {
      expect(
        deriveDeliveryState({ state: MessageState.Pending, type: "broadcast" }),
      ).toEqual({ kind: "pending", relayed: false });
      expect(
        deriveDeliveryState({
          state: MessageState.Failed,
          type: "broadcast",
          relays: 3,
        }),
      ).toEqual({ kind: "failed" });
    });
  });
});

describe("isRetryable", () => {
  it("only failed messages offer Retry", () => {
    expect(isRetryable({ kind: "failed" })).toBe(true);
    expect(isRetryable({ kind: "pending", relayed: true })).toBe(false);
    expect(isRetryable({ kind: "delivered" })).toBe(false);
    expect(isRetryable({ kind: "heardBy", count: 2 })).toBe(false);
  });
});
