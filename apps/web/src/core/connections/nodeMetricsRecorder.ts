import { createLogger, type MeshClient } from "@meshtastic/sdk";
import type {
  NodeMetricSample,
  NodeMetricsRetentionPolicy,
  SqlocalNodeMetricsRepository,
} from "@meshtastic/sdk-storage-sqlocal/nodeMetrics";

const log = createLogger("nodeMetricsRecorder");

export interface NodeMetricsRecorderOptions {
  retention?: NodeMetricsRetentionPolicy;
  /** Run a prune pass after roughly this many appended samples. */
  pruneEvery?: number;
}

/**
 * Records per-node metrics (SNR, hops away, last heard) — the node-level
 * values shown on the Nodes page that Telemetry packets don't carry — into the
 * given repository, so the Telemetry page can chart them for every node.
 *
 * SNR is sampled from every inbound mesh packet (dense signal history); hops
 * away / last heard come from NodeInfo broadcasts. Returns a teardown that
 * detaches the subscriptions.
 */
export function attachNodeMetricsRecorder(
  client: MeshClient,
  repo: SqlocalNodeMetricsRepository,
  options: NodeMetricsRecorderOptions = {},
): () => void {
  const retention = options.retention;
  const pruneEvery = options.pruneEvery ?? 128;
  let sincePrune = 0;

  const record = (samples: NodeMetricSample[]): void => {
    if (samples.length === 0) return;
    repo
      .appendBatch(samples)
      .then(() => {
        sincePrune += samples.length;
        if (retention && sincePrune >= pruneEvery) {
          sincePrune = 0;
          return repo.prune(retention);
        }
      })
      .catch((e: unknown) => {
        log.warn("node metric persist failed", {
          error: (e as Error)?.message,
        });
      });
  };

  const unsubMesh = client.events.onMeshPacket.subscribe((packet) => {
    if (!packet.from) return;
    const time =
      packet.rxTime > 0 ? new Date(packet.rxTime * 1000) : new Date();
    if (Number.isFinite(packet.rxSnr)) {
      record([
        { nodeNum: packet.from, metric: "snr", time, value: packet.rxSnr },
      ]);
    }
  });

  const unsubNodeInfo = client.events.onNodeInfoPacket.subscribe((info) => {
    if (!info.num) return;
    const time =
      info.lastHeard > 0 ? new Date(info.lastHeard * 1000) : new Date();
    const samples: NodeMetricSample[] = [];
    // NodeInfo.snr is 0 when unset; only record a genuine measurement.
    if (Number.isFinite(info.snr) && info.snr !== 0) {
      samples.push({ nodeNum: info.num, metric: "snr", time, value: info.snr });
    }
    if (typeof info.hopsAway === "number") {
      samples.push({
        nodeNum: info.num,
        metric: "hopsAway",
        time,
        value: info.hopsAway,
      });
    }
    if (info.lastHeard > 0) {
      samples.push({
        nodeNum: info.num,
        metric: "lastHeard",
        time,
        value: info.lastHeard,
      });
    }
    record(samples);
  });

  return () => {
    unsubMesh();
    unsubNodeInfo();
  };
}
