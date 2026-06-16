import { peerNodeNum, startPeerRecv } from "../fixtures/peer.ts";
import { expect, test } from "../fixtures/test.ts";

/**
 * Direct (node-addressed) messaging across the real two-node mesh.
 *
 * NOTE: marked fixme — this is a SIMULATOR limitation, not a web-app issue. The
 * DM thread opens and the message composes, but the device NAKs the send with a
 * NO_CHANNEL routing error (6): the `meshtasticd` sim nodes never end up with a
 * usable PKI keypair (no Curve25519 key is provisioned/propagated in their
 * NodeInfo), and current firmware cannot deliver a direct message without a
 * per-node key / decryptable channel, so node B can't decrypt it. The web app
 * surfaces this correctly (it raises the key-refresh dialog). Broadcast already
 * covers bidirectional messaging; re-enable this against real hardware (nodes
 * with PKI keys) or once the sim provisions and shares keys.
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
