import type { Connection } from "@data/schema";
import { TransportHTTP } from "@meshtastic/transport-http";
import logger from "@core/services/logger";
import { testHttpReachable } from "../../utils";
import type { ConnectionStrategy, ConnectionResult } from "./types";

export class HttpStrategy implements ConnectionStrategy {
  async connect(connection: Connection): Promise<ConnectionResult> {
    if (!connection.url) {
      throw new Error("HTTP connection missing URL");
    }

    logger.debug(`[HttpStrategy] Testing HTTP reachability: ${connection.url}`);
    const ok = await testHttpReachable(connection.url);
    
    if (!ok) {
      const url = new URL(connection.url);
      throw new Error(
        url.protocol === "https:"
          ? `Cannot reach HTTPS endpoint. Open ${connection.url} in a new tab to accept the certificate.`
          : "HTTP endpoint not reachable",
      );
    }

    const url = new URL(connection.url);
    logger.debug(`[HttpStrategy] Creating HTTP transport for ${url.host}`);
    
    const transport = await TransportHTTP.create(
      url.host,
      url.protocol === "https:",
    );
    
    logger.info(`[HttpStrategy] HTTP transport created successfully`);
    
    return {
      transport,
      nativeHandle: undefined,
    };
  }

  async disconnect(): Promise<void> {
    // HTTP transport is stateless/request-based, no specific persistent connection to close
    // But if TransportHTTP had a close method, we would call it here.
    return Promise.resolve();
  }
}
