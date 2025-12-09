# NodeDB Store Documentation

## Overview

The NodeDB store manages node information for Meshtastic devices in the web application. It provides a simple, robust interface for storing, retrieving, and updating node data while preventing duplicates during device synchronization.

## Architecture

### Core Components

- **SimpleNodeDB Interface**: Clean, minimal interface with core CRUD operations
- **NodeDB Implementation**: Concrete implementation using Map-based storage
- **NodeDB Store**: Zustand store with persistence and multi-device support
- **Legacy Compatibility**: Maintains backward compatibility with existing code

## SimpleNodeDB Interface

### Core CRUD Operations

```typescript
interface SimpleNodeDB {
  // Basic operations
  get(nodeNum: number): Protobuf.Mesh.NodeInfo | undefined;
  set(nodeNum: number, node: Protobuf.Mesh.NodeInfo): void;
  update(nodeNum: number, updates: Partial<Protobuf.Mesh.NodeInfo>): void;
  upsert(nodeNum: number, node: Protobuf.Mesh.NodeInfo): void;
  
  // Batch operations
  getAll(): Protobuf.Mesh.NodeInfo[];
  clear(): void;
  delete(nodeNum: number): boolean;
  
  // Utility methods
  has(nodeNum: number): boolean;
  size(): number;
  
  // Convenience methods
  updateUser(nodeNum: number, user: Protobuf.Mesh.User): void;
  updatePosition(nodeNum: number, position: Protobuf.Mesh.Position): void;
  updateLastHeard(nodeNum: number, time: number, snr?: number): void;
}
```

### Key Methods

#### `upsert(nodeNum, node)`
**Smart merge operation that prevents duplicates:**
- If node exists: Merges new data with existing, preserving undefined fields
- If node doesn't exist: Creates new node
- **Use case**: Device node downloads to prevent duplicates

#### `update(nodeNum, updates)`
**Partial update of existing node:**
- Throws error if node doesn't exist
- Only updates specified fields
- **Use case**: Incremental updates like position changes

#### `get(nodeNum)`
**Simple retrieval:**
- Returns node if exists, undefined otherwise
- **Use case**: Reading node information

## Implementation Details

### NodeDB Class

The `NodeDB` class implements `NodeOperations` with these characteristics:

- **Internal Storage**: Uses `Map<number, Protobuf.Mesh.NodeInfo>`
- **Smart Merging**: `upsert()` preserves existing data when new data is undefined
- **Legacy Support**: Provides backward-compatible methods
- **Type Safety**: Full TypeScript support with Protobuf types

### Legacy Compatibility Methods

For backward compatibility, these methods are still available:

```typescript
// Legacy methods (now use new implementation internally)
addNode(nodeInfo: Protobuf.Mesh.NodeInfo): void;
addUser(user: PacketMetadata<User>): void;
addPosition(position: PacketMetadata<Position>): void;
processPacket(data: ProcessPacketParams): void;
```

## Store Integration

### Multi-Device Support

The store supports multiple devices simultaneously:

```typescript
interface NodeDBStore {
  addNodeDB(deviceId: number): NodeDB;
  removeNodeDB(deviceId: number): void;
  getNodeDB(deviceId: number): NodeDB | undefined;
  getNodeDBs(): NodeDB[];
}
```

### Persistence

- **Feature Flag**: Controlled by `persistNodeDB` feature flag
- **Storage**: IndexedDB via zustand persist middleware
- **Versioning**: Store versioning for migration support
- **Pruning**: Automatic removal of stale nodes (14 days)

## Usage Patterns

### Device Node Downloads

When nodes are downloaded from a Meshtastic device:

```typescript
// ✅ Correct: Use upsert to prevent duplicates
connection.events.onNodeInfoPacket.subscribe((nodeInfo) => {
  nodeDB.upsertNode(nodeInfo);
});
```

### Real-time Updates

For real-time packet processing:

```typescript
// Position updates
nodeDB.updatePosition(nodeNum, newPosition);

// Last heard updates
nodeDB.updateLastHeard(nodeNum, timestamp, snr);

// User information updates
nodeDB.updateUser(nodeNum, newUser);
```

### Batch Operations

```typescript
// Get all nodes (excluding self)
const allNodes = nodeDB.getNodes(undefined, false);

// Get filtered nodes
const onlineNodes = nodeDB.getNodes(node => node.isOnline);

// Clear all nodes (except self)
nodeDB.removeAllNodes(true);
```

## Testing

### Comprehensive Test Coverage

The SimpleNodeDB interface has 22 unit tests covering:

- ✅ Basic CRUD operations
- ✅ Batch operations  
- ✅ Utility methods
- ✅ Convenience methods
- ✅ Legacy compatibility
- ✅ Edge cases and error handling

### Running Tests

```bash
npm test -- NodeDB.test.ts
```

## Migration Guide

### From Legacy Methods

```typescript
// Old way (could create duplicates)
nodeDB.addNode(nodeInfo);

// New way (prevents duplicates)
nodeDB.upsertNode(nodeInfo);
```

### For New Development

```typescript
// Preferred: Use simple interface
const node = nodeDB.get(nodeNum);
if (node) {
  nodeDB.update(nodeNum, { user: newUser });
} else {
  nodeDB.set(nodeNum, newNode);
}

// Or use upsert for convenience
nodeDB.upsert(nodeNum, newNode);
```

## Performance Considerations

### Memory Usage
- **Map-based**: O(1) access time for all operations
- **Pruning**: Automatic cleanup of stale nodes
- **Persistence**: Only essential data persisted

### CPU Usage
- **Smart Merging**: Only processes changed fields
- **Batch Operations**: Efficient bulk operations
- **Lazy Loading**: Nodes loaded on-demand

## Error Handling

### Common Errors

```typescript
// Update non-existent node
try {
  nodeDB.update(999, updates);
} catch (error) {
  console.error("Node not found:", error.message);
}

// Safe operations
if (nodeDB.has(nodeNum)) {
  nodeDB.update(nodeNum, updates);
}
```

### Validation

The store includes validation for:
- Node number consistency
- Required field presence
- Data type integrity

## Future Enhancements

### Planned Features

- [ ] Indexed queries for better filtering performance
- [ ] Node relationship tracking
- [ ] Enhanced conflict resolution
- [ ] Real-time synchronization indicators

### Extension Points

The simple interface makes it easy to add:
- Custom validation rules
- Additional metadata fields
- Specialized query methods
- Event listeners for changes

## Troubleshooting

### Common Issues

**Duplicate Nodes**
- Use `upsertNode()` instead of `addNode()` for device downloads
- Check if multiple device connections exist

**Memory Leaks**
- Ensure proper cleanup with `removeNodeDB()`
- Monitor node pruning effectiveness

**Performance Issues**
- Use filtering instead of full scans when possible
- Consider pagination for large node lists

### Debug Tools

```typescript
// Debug node count
console.log(`Node count: ${nodeDB.size()}`);

// Debug specific node
console.log("Node details:", nodeDB.get(nodeNum));

// Debug all nodes
console.log("All nodes:", nodeDB.getAll());
```

## API Reference

### Core Methods

| Method | Parameters | Returns | Description |
|--------|------------|---------|-------------|
| `get(nodeNum)` | `number` | `NodeInfo \| undefined` | Retrieve single node |
| `set(nodeNum, node)` | `number, NodeInfo` | `void` | Set/replace node |
| `update(nodeNum, updates)` | `number, Partial<NodeInfo>` | `void` | Update existing node |
| `upsert(nodeNum, node)` | `number, NodeInfo` | `void` | Insert or update node |
| `getAll()` | - | `NodeInfo[]` | Get all nodes |
| `clear()` | - | `void` | Remove all nodes |
| `delete(nodeNum)` | `number` | `boolean` | Delete specific node |
| `has(nodeNum)` | `number` | `boolean` | Check node exists |
| `size()` | - | `number` | Get node count |

### Convenience Methods

| Method | Parameters | Returns | Description |
|--------|------------|---------|-------------|
| `updateUser(nodeNum, user)` | `number, User` | `void` | Update user info |
| `updatePosition(nodeNum, position)` | `number, Position` | `void` | Update position |
| `updateLastHeard(nodeNum, time, snr?)` | `number, number, number?` | `void` | Update last heard |

### Store Methods

| Method | Parameters | Returns | Description |
|--------|------------|---------|-------------|
| `addNodeDB(deviceId)` | `number` | `NodeDB` | Create/get device DB |
| `removeNodeDB(deviceId)` | `number` | `void` | Remove device DB |
| `getNodeDB(deviceId)` | `number` | `NodeDB \| undefined` | Get device DB |
| `getNodeDBs()` | - | `NodeDB[]` | Get all device DBs |