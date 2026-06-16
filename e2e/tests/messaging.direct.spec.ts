import { peerNodeNum, startPeerRecv } from "../fixtures/peer.ts";
import { expect, test } from "../fixtures/test.ts";

/**
 * Direct (node-addressed) messaging across the real two-node mesh.
 *
 * NOTE: marked fixme — this is a SIMULATOR limitation, not a web-app issue.
 * Current firmware requires PKI for direct messages ("Unknown public key for
 * destination ... refusing to send legacy DM") and the `meshtasticd` sim nodes
 * never end up with a usable *broadcast* public key, so the two nodes can't
 * exchange keys and the send is NAK'd (NO_CHANNEL). Note: `config.security`
 * keys ARE settable + persist (verified via admin), but on the native sim they
 * don't sync to the node's owner/NodeInfo key — owner.public_key stays empty
 * and the node keeps its MAC-derived num — so provisioning them doesn't help.
 * The web app behaves correctly (it raises the key-refresh dialog). Broadcast
 * already covers bidirectional messaging; re-enable against real hardware, where
 * keys generate and exchange normally.
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
