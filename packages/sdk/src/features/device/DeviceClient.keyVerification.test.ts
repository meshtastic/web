import { fromBinary } from "@bufbuild/protobuf";
import * as Protobuf from "@meshtastic/protobufs";
import { describe, expect, it } from "vitest";
import { MeshClient } from "../../core/client/MeshClient.ts";
import { createFakeTransport } from "../../core/testing/createFakeTransport.ts";

describe("DeviceClient.sendKeyVerification", () => {
  it("sends a KeyVerificationAdmin to the local node", async () => {
    const { transport, sent } = createFakeTransport();
    const client = new MeshClient({ transport, heartbeatIntervalMs: false });

    client.device
      .sendKeyVerification(
        Protobuf.Admin.KeyVerificationAdmin_MessageType.PROVIDE_SECURITY_NUMBER,
        0,
        123n,
        456,
      )
      .catch(() => {});
    await new Promise((resolve) => setTimeout(resolve, 300));

    const toRadio = fromBinary(Protobuf.Mesh.ToRadioSchema, sent[0]!);
    if (toRadio.payloadVariant.case !== "packet") throw new Error("no packet");
    const data = toRadio.payloadVariant.value.payloadVariant;
    if (data.case !== "decoded") throw new Error("encrypted");
    const admin = fromBinary(
      Protobuf.Admin.AdminMessageSchema,
      data.value.payload,
    );
    expect(admin.payloadVariant.case).toBe("keyVerification");
    if (admin.payloadVariant.case !== "keyVerification") return;
    expect(admin.payloadVariant.value).toMatchObject({
      messageType:
        Protobuf.Admin.KeyVerificationAdmin_MessageType.PROVIDE_SECURITY_NUMBER,
      remoteNodenum: 0,
      nonce: 123n,
      securityNumber: 456,
    });
  });
});
