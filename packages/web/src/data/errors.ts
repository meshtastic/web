/**
 * Base error class for database operations
 */
export class DBError extends Error {
  constructor(
    message: string,
    public readonly operation: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = "DBError";
  }
}

/**
 * Error for channel-related database operations
 */
export class ChannelError extends DBError {
  constructor(
    message: string,
    operation: string,
    public readonly deviceId: number,
    public readonly channelIndex?: number,
    cause?: unknown,
  ) {
    super(message, operation, cause);
    this.name = "ChannelError";
  }

  static getChannels(deviceId: number, cause?: unknown): ChannelError {
    return new ChannelError(
      `Failed to fetch channels for device ${deviceId}`,
      "getChannels",
      deviceId,
      undefined,
      cause,
    );
  }

  static getChannel(
    deviceId: number,
    channelIndex: number,
    cause?: unknown,
  ): ChannelError {
    return new ChannelError(
      `Failed to fetch channel ${channelIndex} for device ${deviceId}`,
      "getChannel",
      deviceId,
      channelIndex,
      cause,
    );
  }

  static getPrimaryChannel(deviceId: number, cause?: unknown): ChannelError {
    return new ChannelError(
      `Failed to fetch primary channel for device ${deviceId}`,
      "getPrimaryChannel",
      deviceId,
      undefined,
      cause,
    );
  }
}

/**
 * Error for node-related database operations
 */
export class NodeError extends DBError {
  constructor(
    message: string,
    operation: string,
    public readonly deviceId: number,
    public readonly nodeNum?: number,
    cause?: unknown,
  ) {
    super(message, operation, cause);
    this.name = "NodeError";
  }

  static getNodes(deviceId: number, cause?: unknown): NodeError {
    return new NodeError(
      `Failed to fetch nodes for device ${deviceId}`,
      "getNodes",
      deviceId,
      undefined,
      cause,
    );
  }

  static getNode(
    deviceId: number,
    nodeNum: number,
    cause?: unknown,
  ): NodeError {
    return new NodeError(
      `Failed to fetch node ${nodeNum} for device ${deviceId}`,
      "getNode",
      deviceId,
      nodeNum,
      cause,
    );
  }

  static getFavorites(deviceId: number, cause?: unknown): NodeError {
    return new NodeError(
      `Failed to fetch favorite nodes for device ${deviceId}`,
      "getFavorites",
      deviceId,
      undefined,
      cause,
    );
  }

  static getRecentNodes(deviceId: number, cause?: unknown): NodeError {
    return new NodeError(
      `Failed to fetch recent nodes for device ${deviceId}`,
      "getRecentNodes",
      deviceId,
      undefined,
      cause,
    );
  }

  static getPositionHistory(
    deviceId: number,
    nodeNum: number,
    cause?: unknown,
  ): NodeError {
    return new NodeError(
      `Failed to fetch position history for node ${nodeNum} on device ${deviceId}`,
      "getPositionHistory",
      deviceId,
      nodeNum,
      cause,
    );
  }

  static getTelemetryHistory(
    deviceId: number,
    nodeNum: number,
    cause?: unknown,
  ): NodeError {
    return new NodeError(
      `Failed to fetch telemetry history for node ${nodeNum} on device ${deviceId}`,
      "getTelemetryHistory",
      deviceId,
      nodeNum,
      cause,
    );
  }

  static getPositionHistoryForNodes(
    deviceId: number,
    cause?: unknown,
  ): NodeError {
    return new NodeError(
      `Failed to fetch position trails for device ${deviceId}`,
      "getPositionHistoryForNodes",
      deviceId,
      undefined,
      cause,
    );
  }
}

/**
 * Error for message-related database operations
 */
export class MessageError extends DBError {
  constructor(
    message: string,
    operation: string,
    public readonly deviceId: number,
    public readonly channelId?: number,
    public readonly nodeNum?: number,
    cause?: unknown,
  ) {
    super(message, operation, cause);
    this.name = "MessageError";
  }

  static getDirectMessages(
    deviceId: number,
    nodeA: number,
    nodeB: number,
    cause?: unknown,
  ): MessageError {
    return new MessageError(
      `Failed to fetch direct messages between nodes ${nodeA} and ${nodeB} on device ${deviceId}`,
      "getDirectMessages",
      deviceId,
      undefined,
      nodeA,
      cause,
    );
  }

  static getChannelMessages(
    deviceId: number,
    channelId: number,
    cause?: unknown,
  ): MessageError {
    return new MessageError(
      `Failed to fetch channel messages for channel ${channelId} on device ${deviceId}`,
      "getChannelMessages",
      deviceId,
      channelId,
      undefined,
      cause,
    );
  }

  static getBroadcastMessages(
    deviceId: number,
    channelId: number,
    cause?: unknown,
  ): MessageError {
    return new MessageError(
      `Failed to fetch broadcast messages for channel ${channelId} on device ${deviceId}`,
      "getBroadcastMessages",
      deviceId,
      channelId,
      undefined,
      cause,
    );
  }

  static getAllMessages(deviceId: number, cause?: unknown): MessageError {
    return new MessageError(
      `Failed to fetch all messages for device ${deviceId}`,
      "getAllMessages",
      deviceId,
      undefined,
      undefined,
      cause,
    );
  }

  static getPendingMessages(deviceId: number, cause?: unknown): MessageError {
    return new MessageError(
      `Failed to fetch pending messages for device ${deviceId}`,
      "getPendingMessages",
      deviceId,
      undefined,
      undefined,
      cause,
    );
  }

  static getConversations(deviceId: number, cause?: unknown): MessageError {
    return new MessageError(
      `Failed to fetch conversations for device ${deviceId}`,
      "getConversations",
      deviceId,
      undefined,
      undefined,
      cause,
    );
  }
}

/**
 * Error for connection-related database operations
 */
export class ConnectionError extends DBError {
  constructor(
    message: string,
    operation: string,
    public readonly connectionId?: number,
    cause?: unknown,
  ) {
    super(message, operation, cause);
    this.name = "ConnectionError";
  }

  static getConnections(cause?: unknown): ConnectionError {
    return new ConnectionError(
      "Failed to fetch connections",
      "getConnections",
      undefined,
      cause,
    );
  }

  static getConnection(connectionId: number, cause?: unknown): ConnectionError {
    return new ConnectionError(
      `Failed to fetch connection ${connectionId}`,
      "getConnection",
      connectionId,
      cause,
    );
  }

  static getDefaultConnection(cause?: unknown): ConnectionError {
    return new ConnectionError(
      "Failed to fetch default connection",
      "getDefaultConnection",
      undefined,
      cause,
    );
  }
}
