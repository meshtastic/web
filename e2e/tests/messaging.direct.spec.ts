import { peerNodeNum, startPeerRecv } from "../fixtures/peer.ts";
import { expect, test } from "../fixtures/test.ts";

/**
 * Direct (node-addressed) messaging across the real two-node mesh.
 *
 * NOTE: currently marked fixme. The DM thread opens and the message composes,
 * but the app raises a "Keys Mismatch" dialog and refuses to send — the SDK's
 * stored public key for the peer node does not match the key presented during
 * NodeInfo exchange (a PKI key-verification edge case observed even with fresh
 * sim nodes). The app blocks the send by design, so the DM never reaches the
 * mesh. Bidirectional text messaging is already covered by the broadcast suite;
 * re-enable this once DM key verification is resolved (or the suite pre-seeds /
 * accepts the peer key).
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
