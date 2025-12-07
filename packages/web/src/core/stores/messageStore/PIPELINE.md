# Message Pipeline System

## Overview

The message pipeline system provides a flexible way to process outgoing messages before they are sent to the radio. This allows for business logic to be executed consistently across all message sending scenarios.

## Architecture

### Core Components

1. **Pipeline Types** (`types.ts`):
   - `OutgoingMessage`: The message data structure
   - `PipelineContext`: Context information (deviceId, myNodeNum)
   - `PipelineHandler`: Function signature for handlers
   - `PipelineHandlers`: Map of registered handlers

2. **Pipeline Methods** (in `MessageStore`):
   - `registerPipelineHandler(name, handler)`: Register a new handler
   - `unregisterPipelineHandler(name)`: Remove a handler
   - `processOutgoingMessage(message)`: Execute all handlers

3. **Built-in Handlers** (`pipelineHandlers.ts`):
   - `autoFavoriteDMHandler`: Auto-favorites DM recipients
   - `loggingHandler`: Logs outgoing messages

## Usage

### Setting Up the Pipeline

The pipeline is automatically set up using the `useMessagePipeline` hook in your component:

```typescript
import { useMessagePipeline } from "@core/hooks/useMessagePipeline";

function MessagesPage() {
  useMessagePipeline(); // Registers default handlers
  // ... rest of component
}
```

### Sending Messages Through the Pipeline

Before sending a message to the radio, process it through the pipeline:

```typescript
// Process message through pipeline
await messages.processOutgoingMessage({
  text: "Hello!",
  to: nodeNum, // or "broadcast"
  channelId: 0, // for broadcast messages
  wantAck: true,
});

// Then send to radio
const messageId = await device.connection.sendText(/*...*/);
```

### Creating Custom Handlers

Create a custom handler:

```typescript
import type { PipelineHandler } from "@core/stores";

const myCustomHandler: PipelineHandler = async (message, context) => {
  // Only process direct messages
  if (typeof message.to !== "number") {
    return;
  }

  // Your business logic here
  console.log(`Sending DM to node ${message.to}`);

  // Access context
  if (context.myNodeNum === message.to) {
    console.log("Sending message to self");
  }
};

// Register the handler
messages.registerPipelineHandler("myCustomHandler", myCustomHandler);
```

### Handler Execution

- Handlers are executed in **registration order**
- Each handler is `await`ed before the next one runs
- If a handler throws an error, it's caught and logged, but other handlers continue
- Handlers receive the message and context as parameters

## Built-in Handlers

### autoFavoriteDMHandler

**Purpose**: Automatically marks nodes as favorites when you send them a DM.

**Business Requirement**: Users who receive DMs should be automatically added to favorites for easy access.

**Behavior**:
- Only processes direct messages (ignores broadcasts)
- Skips if sending to self
- Checks if node is already favorited
- Updates nodeDB to mark node as favorite

**Example**:
```typescript
// When you send a DM to node 200
await messages.processOutgoingMessage({
  text: "Hi there!",
  to: 200,
});
// Node 200 is now automatically favorited
```

### loggingHandler

**Purpose**: Debug logging for outgoing messages.

**Behavior**:
- Logs message type (Direct/Broadcast)
- Logs destination and channel
- Logs message length
- Logs device context

## Testing

Comprehensive unit tests are available:

- `pipelineHandlers.test.ts`: Tests for individual handlers
- `pipeline.test.ts`: Tests for pipeline infrastructure

Run tests:
```bash
pnpm test pipelineHandlers.test.ts
pnpm test pipeline.test.ts
```

## Extension Points

### Adding New Handlers

1. Create handler in `pipelineHandlers.ts`:
```typescript
export const myHandler: PipelineHandler = async (message, context) => {
  // Your logic
};
```

2. Register in `useMessagePipeline.ts`:
```typescript
useEffect(() => {
  messages.registerPipelineHandler("myHandler", myHandler);

  return () => {
    messages.unregisterPipelineHandler("myHandler");
  };
}, [messages]);
```

### Handler Best Practices

1. **Be defensive**: Check for null/undefined values
2. **Fail gracefully**: Don't throw errors for expected conditions
3. **Log appropriately**: Use console.log for info, console.error for errors
4. **Keep it fast**: Handlers block message sending
5. **Be specific**: Only process messages you care about

## Implementation Details

### Why a Pipeline?

- **Separation of concerns**: Business logic separate from UI
- **Testability**: Each handler can be tested independently
- **Flexibility**: Easy to add/remove handlers
- **Consistency**: Logic runs for all messages

### Performance Considerations

- Handlers run sequentially, not in parallel
- Keep handlers fast to avoid delaying message sending
- Consider using background tasks for heavy operations

### Error Handling

```typescript
// In processOutgoingMessage
for (const [name, handler] of handlers) {
  try {
    await handler(message, context);
  } catch (error) {
    console.error(`Handler ${name} failed:`, error);
    // Continue processing other handlers
  }
}
```

## Future Enhancements

Potential additions:
- Handler priorities/ordering
- Conditional handler registration
- Handler composition
- Async handler results
- Pipeline analytics
