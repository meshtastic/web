import { create } from "@bufbuild/protobuf";
import { Protobuf } from "@core/protobuf.ts";
import { describe, expect, it } from "vitest";
import { beaconSenderName } from "./BeaconOffers.tsx";

const node = (num: number, longName: string, shortName: string) => ({
  num,
  isFavorite: false,
  isIgnored: false,
  user: create(Protobuf.Mesh.UserSchema, { longName, shortName }),
});

describe("beaconSenderName", () => {
  it("uses the long name, then the short name", () => {
    expect(beaconSenderName([node(1, "Hilltop", "HT")], 1)).toBe("Hilltop");
    expect(beaconSenderName([node(1, " ", "HT")], 1)).toBe("HT");
  });

  it("falls back to the node id", () => {
    expect(beaconSenderName([], 0x71275a97)).toBe("!71275a97");
  });
});
