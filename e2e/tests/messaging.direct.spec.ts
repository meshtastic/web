import { peerNodeNum, startPeerRecv } from "../fixtures/peer.ts";
import { expect, test } from "../fixtures/test.ts";

/**
 * Direct (node-addressed) messaging across the real two-node mesh.
 *
 * NOTE: marked fixme — this is a SIMULATOR limitation, not a web-app issue, and
 * it bottoms out in the firmware's SimRadio:
 *   - DMs go out PKI-encrypted. PKI key generation is gated on a set LoRa region
 *     (NodeDB.cpp:3051 — keygen is skipped while region == UNSET) and the sim
 *     nodes boot region-UNSET. Setting `lora.region` via admin DOES fix key gen
 *     + exchange (verified: both nodes learn each other's public key).
 *   - But a PKI-encrypted DM still can't traverse the SimRadio: the PKC overhead
 *     pushes the packet past the SimRadio payload limit ("Payload size larger
 *     than compressed message allows! Send empty payload"), so it is truncated
 *     and the receiver can't decode it ("No suitable channel found for decoding,
 *     hash 0x0") -> NO_CHANNEL. The firmware deliberately skips PKC under the
 *     --sim flag (Router.cpp:730) for exactly this reason, but --sim also
 *     disables config-file loading (Webserver/EnableUDP/MAC) that the web app's
 *     HTTP API + UDP mesh require, so the two are mutually exclusive.
 * The web app behaves correctly (it raises the key-refresh dialog). Broadcast
 * already covers bidirectional messaging; re-enable against real hardware, where
 * real LoRa carries PKC fine.
 */
test.describe("direct messaging over a real two-node mesh", () => {
  test.beforeEach(async ({ connectionPage, messagesPage, device }) => {
    await connectionPage.connectHttp({ host: device.host, tls: device.tls });
    await messagesPage.waitReady();
  });

  test.fixme(
    "delivers a direct message from the browser to the peer node (web -> mesh)",
    async ({ messagesPage }) => {
      const peerNum = await peerNodeNum();
      const nonce = `dm-${Date.now()}`;
      const recv = await startPeerRecv(nonce, { timeout: 60 });
      await messagesPage.openDirectMessageByNodeNum(peerNum);
      await messagesPage.send(nonce);
      const from = await recv.received;
      expect(from).toBeGreaterThan(0);
    },
  );
});
