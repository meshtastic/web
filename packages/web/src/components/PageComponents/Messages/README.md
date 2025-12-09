# Message Status Indicator Implementation

## Overview

This implementation provides comprehensive message status indicators for the Meshtastic web client, showing real-time transmission status through the message pipeline.

## Components

### 1. MessageStatusIndicator

**Location**: `/packages/web/src/components/PageComponents/Messages/MessageStatusIndicator.tsx`

Shows the current transmission state of a message with appropriate icons and text:

- **Waiting**: Clock icon - Message queued for transmission
- **Sending**: Spinning loader - Message being transmitted  
- **Sent**: Single check - Delivered to radio
- **Ack**: Double check - Acknowledged by recipient
  - Green check for real ACK (from recipient)
  - Blue check for mesh ACK (from mesh network)
- **Failed**: X icon - Transmission failed

**Features**:
- Shows retry count for failed messages
- Displays SNR for acknowledged messages
- Conditional rendering based on message ownership
- Accessible tooltips and ARIA labels

### 2. MessageBubble

**Location**: `/packages/web/src/components/PageComponents/Messages/MessageBubble.tsx`

Enhanced message bubble component that integrates status indicators:

- Displays message content with proper styling
- Shows sender avatar and name for received messages
- Integrates MessageStatusIndicator for sent messages
- Includes retry button for failed messages
- MQTT indicator for messages received via MQTT
- Responsive design with hover states

### 3. RetryButton

**Location**: `/packages/web/src/components/PageComponents/Messages/RetryButton.tsx`

Provides retry functionality for failed messages:

- Only shows for failed messages with remaining retries
- Integrates with message store retry mechanism
- Shows loading state during retry
- Displays retry attempt count

## Integration with Message Pipeline

### Message States

The system uses a comprehensive state machine:

```typescript
enum MessageState {
  Waiting = "waiting",    // Initial state when message is created
  Sending = "sending",    // When being processed by pipeline
  Sent = "sent",         // When sent to radio successfully
  Ack = "ack",           // When ACK is received
  Failed = "failed",      // When send fails or no ACK received
}
```

### Pipeline Handlers

1. **messageStorageHandler**: Creates message with "waiting" state
2. **autoFavoriteDMHandler**: Auto-favorites DM recipients
3. **ackTrackingHandler**: Sets up ACK timeout monitoring
4. **radioTransmissionHandler**: Sends via radio and updates state
5. **loggingHandler**: Debug logging

### Enhanced ACK Tracking

Each message tracks:
- `receivedACK`: Whether ACK was received
- `ackError`: Error code if any
- `ackTimestamp`: When ACK was received
- `ackSNR`: Signal-to-noise ratio of ACK
- `realACK`: Whether ACK is from recipient (true) or mesh (false)
- `retryCount`: Number of retry attempts
- `maxRetries`: Maximum allowed retries

## Usage

### Basic Usage

```tsx
import { MessageStatusIndicator } from "@components/PageComponents/Messages/MessageStatusIndicator";

<MessageStatusIndicator message={message} />
```

### Message Bubble

```tsx
import { MessageBubble } from "@components/PageComponents/Messages/MessageBubble";

<MessageBubble
  message={message}
  myNodeNum={myNodeNum}
  senderName={senderName}
  isMine={isMine}
  deviceId={device.id}
/>
```

### Retry Button

```tsx
import { RetryButton } from "@components/PageComponents/Messages/RetryButton";

<RetryButton
  messageId={message.messageId}
  deviceId={device.id}
/>
```

## Styling

The components use Tailwind CSS with consistent design patterns:

- Status indicators use semantic colors (green for success, red for failure, blue for in-progress)
- Icons are sized consistently (3w-3h for inline, 4w-4h for standalone)
- Hover states and transitions for interactive elements
- Responsive design with proper spacing

## Testing

Comprehensive test coverage includes:

- **MessageStatusIndicator.test.tsx**: Tests all states and edge cases
- **MessageBubble.test.tsx**: Tests rendering and interactions
- **RetryButton.test.tsx**: Tests retry functionality

Run tests with:
```bash
pnpm test MessageStatusIndicator
pnpm test MessageBubble
pnpm test RetryButton
```

## Accessibility

- Semantic HTML elements
- ARIA labels and roles
- Keyboard navigation support
- High contrast colors
- Screen reader friendly

## Performance

- Minimal re-renders using React.memo where appropriate
- Efficient state updates through Zustand
- Lazy loading of icons
- Optimized animations using CSS transforms

## Future Enhancements

Potential improvements:
1. **Delivery receipts**: Multi-hop delivery tracking
2. **Read receipts**: Message read confirmation
3. **Rich status**: Typing indicators, online status
4. **Analytics**: Message delivery metrics
5. **Batch operations**: Bulk retry, delete operations

## Troubleshooting

### Common Issues

1. **Status not updating**: Check message store hydration and pipeline registration
2. **Retry not working**: Verify deviceId and message store connection
3. **Styling issues**: Ensure Tailwind CSS classes are properly loaded
4. **Missing icons**: Check Lucide React imports

### Debug Logging

Enable debug logging to trace message flow:
```typescript
console.log("[MessageStatusIndicator] State:", message.state);
console.log("[MessageBubble] Rendering message:", message.messageId);
```

## Dependencies

- **React**: Component framework
- **Lucide React**: Icon library
- **Zustand**: State management
- **Tailwind CSS**: Styling
- **Core stores**: Message and device state management