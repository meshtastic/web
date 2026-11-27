import { create } from "@bufbuild/protobuf";
import { Protobuf } from "@core/protobuf.ts";
import type { Node } from "@core/storage/types.ts";
import { describe, expect, it } from "vitest";
import { directContactAction } from "./directContact.ts";

const KEY = new Uint8Array(32).fill(7);
const Role = Protobuf.Config.Config_DeviceConfig_Role;

const node = (num: number, partial: Partial<Node> = {}): Node => ({
  num,
  isFavorite: false,
  isIgnored: false,
  ...partial,
});
const user = (
  partial: Omit<Partial<Protobuf.Mesh.User>, "$typeName" | "$unknown"> = {},
) => create(Protobuf.Mesh.UserSchema, { longName: "Peer", ...partial });

const PEER = 0x1234;
const keyed = node(PEER, { user: user({ publicKey: KEY }) });
const keyless = node(PEER, { user: user() });
const me = node(1, { user: user({ role: Role.CLIENT }) });
const base = node(1, { user: user({ role: Role.CLIENT_BASE }) });

describe("directContactAction", () => {
  it("shares a keyed peer's contact on firmware 2.7.12 and later", () => {
    const verified = { ...keyed, isKeyManuallyVerified: true };
    for (const firmwareVersion of ["2.7.12", "2.8.2.abc1234"]) {
      expect(
        directContactAction({
          peerNum: PEER,
          peer: verified,
          me: base,
          firmwareVersion,
        }),
      ).toEqual({
        kind: "shareContact",
        contact: { nodeNum: PEER, user: verified.user, manuallyVerified: true },
      });
    }
  });

  it("never shares a contact without a key, so the radio keeps the one it has", () => {
    for (const peer of [keyless, undefined]) {
      expect(
        directContactAction({
          peerNum: PEER,
          peer,
          me,
          firmwareVersion: "2.8.2",
        }),
      ).toEqual({ kind: "none" });
    }
  });

  it("favorites the peer of a legacy DM on older firmware", () => {
    for (const firmwareVersion of ["2.7.11", undefined]) {
      expect(
        directContactAction({
          peerNum: PEER,
          peer: keyless,
          me,
          firmwareVersion,
        }),
      ).toEqual({ kind: "favorite" });
    }
  });

  it("leaves a PKI DM, an existing favorite and CLIENT_BASE alone on older firmware", () => {
    const old = { peerNum: PEER, me, firmwareVersion: "2.7.11" };
    expect(directContactAction({ ...old, peer: keyed })).toEqual({
      kind: "none",
    });
    expect(
      directContactAction({ ...old, peer: { ...keyless, isFavorite: true } }),
    ).toEqual({ kind: "none" });
    expect(directContactAction({ ...old, me: base, peer: keyless })).toEqual({
      kind: "none",
    });
  });
});
