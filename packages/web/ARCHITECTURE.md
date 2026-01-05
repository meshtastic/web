# Meshtastic Web: Architecture Documentation

## Overview

Meshtastic Web is the official web client for [Meshtastic](https://meshtastic.org) mesh radio networks. This document covers the architecture of approximately 46,000 lines of TypeScript/React code across 270+ files. The client enables users to configure devices, send messages, view nodes on a map, and monitor mesh network health.

**Live instances:**
- Production: [client.meshtastic.org](https://client.meshtastic.org)
- Staging: [client-test.meshtastic.org](https://client-test.meshtastic.org)

## Core Architecture

The application follows a feature-based architecture with clear separation of concerns:

```
┌─────────────────────────────────────────────────────────────┐
│                      UI Layer                                │
│  React 19 + TanStack Router + Tailwind CSS + shadcn/ui      │
├─────────────────────────────────────────────────────────────┤
│                    State Layer                               │
│  Zustand (deviceStore, uiStore) + React Context             │
├─────────────────────────────────────────────────────────────┤
│                   Data Layer                                 │
│  Drizzle ORM + SQLite (via sqlocal) + Repositories          │
├─────────────────────────────────────────────────────────────┤
│                Transport Layer                               │
│  @meshtastic/core + Web Bluetooth/Serial/HTTP transports    │
└─────────────────────────────────────────────────────────────┘
```

## Technology Stack

| Category | Technologies |
|----------|-------------|
| **Framework** | React 19, TypeScript 5.9, Vite 7 |
| **Routing** | TanStack Router with type-safe routes |
| **State** | Zustand with subscribeWithSelector middleware |
| **Database** | SQLite via sqlocal, Drizzle ORM |
| **Styling** | Tailwind CSS 4, shadcn/ui components |
| **Forms** | React Hook Form + Zod validation |
| **Maps** | MapLibre GL + react-map-gl |
| **i18n** | i18next with 20+ language support |
| **Testing** | Vitest + Testing Library |

## Directory Structure

```
src/
├── app/                         # App shell
│   ├── App.tsx                  # Root application component
│   ├── routes.tsx               # Route definitions with guards
│   └── layouts/                 # Layout components
│       ├── AppLayout.tsx        # Main layout wrapper
│       └── AppSidebar.tsx       # Navigation sidebar
│
├── features/                    # Feature modules (colocated code)
│   ├── connections/             # Device connection management
│   │   ├── pages/               # ConnectionsPage
│   │   ├── components/          # AddConnectionDialog, SupportedBadge, etc.
│   │   ├── hooks/               # useConnections
│   │   └── utils.ts             # Connection utilities
│   │
│   ├── messages/                # Messaging feature
│   │   ├── pages/               # MessagesPage
│   │   ├── components/          # ChatPanel, MessageBubble, MessageInput
│   │   └── hooks/               # useMessages, useMessageDraft, useUnreadCount
│   │
│   ├── nodes/                   # Node management feature
│   │   ├── pages/               # NodesPage
│   │   ├── components/          # Node-specific components
│   │   ├── hooks/               # useNodes
│   │   └── utils/               # nodeSort, signalColor
│   │
│   ├── map/                     # Map feature
│   │   ├── pages/               # MapPage
│   │   └── components/          # Map, Layers/, Markers/, Popups/, Tools/
│   │
│   ├── preferences/             # App preferences feature
│   │   └── pages/               # PreferencesPage
│   │
│   └── settings/                # Settings feature
│       ├── pages/               # SettingsPage, RadioConfig, DeviceConfig, ModuleConfig
│       ├── hooks/               # useChannelForm, useConfigForm, useDeviceForm, etc.
│       ├── components/
│       │   ├── panels/          # Config panels
│       │   │   ├── Channels/    # Channel configuration (Channel.tsx, Channels.tsx, validation.ts)
│       │   │   ├── Device/      # Device settings
│       │   │   ├── Security/    # Security settings
│       │   │   └── *.tsx        # Bluetooth, Display, LoRa, Network, Position, Power
│       │   ├── modules/         # MQTT, Telemetry, CannedMessage, etc.
│       │   ├── form/            # ConfigFormFields, FormInput, FormSelect
│       │   └── activity/        # ActivityPanel, ActivityItem
│       ├── validation/
│       │   ├── config/          # Zod schemas for device config
│       │   └── moduleConfig/    # Zod schemas for module config
│       └── services/
│           └── fieldRegistry/   # Form field tracking service
│
├── shared/                      # Truly shared code
│   ├── components/
│   │   ├── ui/                  # shadcn/ui primitives (button, card, dialog, etc.)
│   │   ├── Badge/               # ConnectionStatusBadge
│   │   ├── CommandPalette/      # Command palette component
│   │   ├── Dialog/              # Modal dialogs (PKIBackupDialog, RemoveNodeDialog, etc.)
│   │   ├── Filter/              # Filter components
│   │   ├── Table/               # Table component
│   │   ├── BatteryStatus.tsx    # Battery status indicator
│   │   ├── DeviceImage.tsx      # Device image component
│   │   ├── LanguageSwitcher.tsx
│   │   ├── MeshNetwork.tsx      # Mesh network visualization
│   │   ├── Mono.tsx             # Monospace text component
│   │   ├── NodeAvatar.tsx       # Node avatar component
│   │   ├── OnlineIndicator.tsx  # Online status indicator
│   │   ├── SignalIndicator.tsx  # Signal strength indicator
│   │   ├── TimeAgo.tsx          # Relative time display
│   │   ├── Toaster.tsx          # Toast notifications
│   │   └── WelcomeSplash.tsx    # Welcome screen
│   │
│   ├── hooks/                   # Shared hooks
│   │   ├── useBrowserFeatureDetection.ts
│   │   ├── useCopyToClipboard.ts
│   │   ├── useDebounce.ts
│   │   ├── useDeleteMessages.ts
│   │   ├── useDeviceCommands.ts  # Device command interface
│   │   ├── useDeviceContext.ts
│   │   ├── useFavoriteNode.ts
│   │   ├── useFeatureFlags.ts
│   │   ├── useFilter.ts
│   │   ├── useIgnoreNode.ts
│   │   ├── useIsMobile.ts
│   │   ├── useLanguage.ts
│   │   ├── useLocalStorage.ts
│   │   ├── useMapFitting.ts
│   │   ├── useMyNode.ts          # Device context hooks (useMyNode, useNodeNum, useNodeNumSafe)
│   │   ├── usePasswordVisibilityToggle.ts
│   │   ├── usePinnedItems.ts
│   │   ├── usePositionFlags.ts
│   │   ├── useTheme.ts
│   │   ├── useToast.ts
│   │   ├── useTraceroute.ts
│   │   └── useWindowFocus.ts
│   │
│   └── utils/                   # Shared utilities
│       ├── bitwise.ts
│       ├── cn.ts                # className utility
│       ├── color.ts
│       ├── debounce.ts
│       ├── deepCompareConfig.ts
│       ├── dotPath.ts
│       ├── eventBus.ts
│       ├── geo.ts
│       ├── github.ts
│       ├── ip.ts
│       ├── messagePipelineHandlers.ts
│       ├── pskSchema.ts
│       ├── randId.ts
│       ├── sort.ts
│       ├── string.ts
│       ├── typeGuards.ts
│       └── x25519.ts
│
├── state/                       # Global state management
│   ├── device/                  # Device store (Zustand)
│   │   ├── store.ts             # Device state, connection tracking
│   │   └── types.ts             # Device-related types
│   └── ui/                      # UI preferences store
│       ├── index.ts             # Re-exports
│       └── store.ts             # Theme, language, column visibility
│
├── data/                        # Data layer
│   ├── schema.ts                # Drizzle ORM schema definitions
│   ├── client.ts                # SQLite client initialization
│   ├── types.ts                 # Data layer types
│   ├── errors.ts                # Data error types
│   ├── packetBatcher.ts         # Packet batching utility
│   ├── subscriptionService.ts   # Data subscription service
│   ├── migrationService.ts      # Database migration service
│   ├── repositories/            # Data access layer
│   │   ├── MessageRepository.ts
│   │   ├── NodeRepository.ts
│   │   ├── ChannelRepository.ts
│   │   ├── ConnectionRepository.ts
│   │   ├── PacketLogRepository.ts
│   │   ├── PreferencesRepository.ts
│   │   └── TracerouteRepository.ts
│   ├── hooks/                   # Database hooks
│   │   ├── useChannels.ts
│   │   ├── useDevicePreference.ts
│   │   ├── usePacketLogs.ts
│   │   ├── usePreferences.ts
│   │   └── useSignalLogs.ts
│   └── migrations/              # SQL migration files
│
├── core/                        # Core services
│   ├── dto/                     # Data transfer objects
│   │   ├── NodeNumToNodeInfoDTO.ts
│   │   └── PacketToMessageDTO.ts
│   └── services/                # Business logic services
│       ├── adminMessageService.ts
│       ├── configBackupService.ts
│       ├── maintenanceService.ts
│       ├── featureFlags.ts
│       └── logger.ts
│
├── tests/                       # Test configuration
│   ├── setup.ts
│   └── test-utils.tsx
│
├── DeviceWrapper.tsx            # Device context provider
├── i18n-config.ts               # Internationalization config
├── index.tsx                    # Application entry point
└── index.css                    # Global styles
```

## Path Aliases

The project uses TypeScript path aliases for clean imports:

| Alias | Path |
|-------|------|
| `@app/*` | `./src/*` |
| `@features/*` | `./src/features/*` |
| `@shared/*` | `./src/shared/*` |
| `@state/*` | `./src/state/*` |
| `@data/*` | `./src/data/*` |
| `@core/*` | `./src/core/*` |
| `@public/*` | `./public/*` |

## State Management

### Device Store (`src/state/device/store.ts`)
- Manages connected Meshtastic devices
- Tracks connection phase: `disconnected → connecting → configuring → connected → configured`
- Stores device config, module config, and ephemeral state
- Handles change tracking for settings forms

### UI Store (`src/state/ui/store.ts`)
- **Ephemeral state only** (not persisted):
  - Modal/dialog visibility (`connectDialogOpen`, `nodeNumDetails`, `tracerouteNodeNum`)
  - Command palette state
  - Message tab state (`messageTabs`, `activeMessageTabId`, `secondaryMessageTabId`, `messageSplitMode`)
- Exports `DEFAULT_PREFERENCES` for use with the preferences hook

### Preferences System

User preferences are persisted to SQLite using reactive queries:

```
Component ──> usePreference(key, default) ──> useReactiveQuery ──> PreferencesRepository (SQLite)
                                                     ↑
                                          (auto-updates on DB changes)
```

**Key files:**
- `src/data/hooks/usePreferences.ts` - Preferences hook using `useReactiveQuery`
- `src/data/repositories/PreferencesRepository.ts` - Database access with query builders
- `src/state/ui/store.ts` - `DEFAULT_PREFERENCES` constants

**Usage:**
```typescript
import { usePreference } from "@data/hooks";
import { DEFAULT_PREFERENCES } from "@state/ui";

const [theme, setTheme] = usePreference("theme", DEFAULT_PREFERENCES.theme);
```

The `usePreference` hook uses `preferencesRepo.buildPreferenceQuery(key)` with `useReactiveQuery` for automatic updates when preferences change.

**Available preferences:**
- `theme` - Light/dark/system theme
- `compactMode` - Compact UI mode
- `showNodeAvatars` - Show node avatars
- `language` - UI language
- `timeFormat` - 12h/24h time format
- `distanceUnits` - Imperial/metric
- `coordinateFormat` - DD/DMS/UTM
- `mapStyle` - Map tile style
- `showNodeLabels` - Show labels on map
- `showConnectionLines` - Show connection lines on map
- `autoCenterOnPosition` - Auto-center map on position updates
- `masterVolume` - Audio volume (0-100)
- `messageSoundEnabled` - Message notification sounds
- `alertSoundEnabled` - Alert sounds
- `packetBatchSize` - Packet batching size
- `nodesTableColumnVisibility` - Visible columns in nodes table
- `nodesTableColumnOrder` - Column ordering in nodes table
- `rasterSources` - Custom map raster sources

## Device-Scoped Architecture

The application supports multiple Meshtastic devices. All data is scoped to a specific device using `ownerNodeNum` (the device's node number) as a foreign key. The current device context is determined by the URL.

### URL-Based Device Context

After connecting to a device, the user is navigated to `/$nodeNum/messages?channel=0`. The `nodeNum` URL parameter identifies which device's data to display.

```
URL: /2662173639/messages?channel=0
      ↑
      └── nodeNum identifies the connected device
```

### Accessing the Current Device's nodeNum

Use the `useMyNode` hook to get the current device context:

```typescript
import { useMyNode } from "@shared/hooks";

function MyComponent() {
  const { myNodeNum, myNode } = useMyNode();

  // myNodeNum: number | undefined - extracted from URL params
  // myNode: Node | undefined - the device's node data from database

  if (!myNodeNum) {
    return <div>Not connected</div>;
  }

  // Use myNodeNum for queries
  const { messages } = useChannelMessages(myNodeNum, channelId, 100);
}
```

**Implementation details:**
- `useMyNode()` internally calls `useNodeNumSafe()` which extracts `nodeNum` from TanStack Router's `useParams()`
- Returns `undefined` when not in a connected route (e.g., `/connect` page)
- The `connectedLayoutRoute` validates the nodeNum and checks device existence before rendering

### Database Scoping with ownerNodeNum

All database tables use `ownerNodeNum` as a scoping key:

```typescript
// Saving a message - use myNodeNum as ownerNodeNum
const newMessage: NewMessage = {
  ownerNodeNum: myNodeNum,  // Critical: scope to current device
  messageId: packetId,
  type: "channel",
  channelId: 0,
  // ... other fields
};
await messageRepo.saveMessage(newMessage);

// Querying messages - filter by ownerNodeNum
const query = messageRepo.buildBroadcastMessagesQuery(myNodeNum, channelId, limit);
// This generates: SELECT * FROM messages WHERE ownerNodeNum = ? AND ...
```

**Key tables with ownerNodeNum:**
- `messages` - Scopes messages to the device that received/sent them
- `nodes` - Scopes discovered nodes to the device that saw them
- `channels` - Scopes channel configs to the device they belong to
- `positionLogs`, `telemetryLogs`, `packetLogs` - Scopes logs to the receiving device

This architecture enables:
- Multiple devices to store data without conflicts
- Switching between devices without data mixing
- Per-device message history and node discovery

## Database Layer

Uses Drizzle ORM with SQLite (sqlocal) for client-side persistence:

| Table | Purpose |
|-------|---------|
| `messages` | Direct and channel messages with delivery state |
| `nodes` | Node metadata, position, telemetry (deduplicated by deviceId+nodeNum) |
| `channels` | Channel configuration per device |
| `connections` | Saved HTTP/Bluetooth/Serial connections |
| `positionLogs` | Historical position data |
| `telemetryLogs` | Historical battery/environment metrics |
| `packetLogs` | Raw packet metadata for debugging |
| `tracerouteLogs` | Route discovery results |
| `preferences` | Key-value user preferences |

### Repository Pattern

Data access is abstracted through repositories in `src/data/repositories/`:
- `MessageRepository` - Message CRUD with conversation queries
- `NodeRepository` - Node upsert with position/telemetry updates
- `ChannelRepository` - Channel configuration management
- `ConnectionRepository` - Saved connection management
- `PacketLogRepository` - Raw packet logging for debugging
- `PreferencesRepository` - Key-value user preferences
- `TracerouteRepository` - Route discovery results

#### Query Builder Pattern with Reactive Updates

Repositories expose two types of methods:

1. **Mutation methods** - Execute database operations directly:
   ```typescript
   await nodeRepo.upsertNode(node);
   await messageRepo.saveMessage(message);
   ```

2. **Query builder methods** - Return Drizzle query objects (not executed) for use with `useReactiveQuery`:
   ```typescript
   // Repository method returns query object
   buildNodesQuery(ownerNodeNum: number) {
     return this.db.select().from(nodes).where(eq(nodes.ownerNodeNum, ownerNodeNum));
   }
   ```

This pattern enables automatic reactivity via sqlocal's `useReactiveQuery`, which subscribes to database changes and re-runs queries when relevant tables are modified:

```typescript
// Hook using repository query builder
export function useNodes(deviceId: number) {
  const query = useMemo(() => nodeRepo.buildNodesQuery(deviceId), [deviceId]);
  const { data, status } = useReactiveQuery(nodeRepo.getClient(), query);

  // data automatically updates when nodes table changes
  return { nodes: data ?? [], isLoading: status === "pending" };
}
```

**Repository methods:**

| Repository | Query Builders |
|------------|----------------|
| `NodeRepository` | `buildNodesQuery()`, `buildOnlineNodesQuery()`, `buildPositionHistoryQuery()`, `buildTelemetryHistoryQuery()` |
| `MessageRepository` | `buildDirectMessagesQuery()`, `buildBroadcastMessagesQuery()`, `buildAllMessagesQuery()`, `buildPendingMessagesQuery()`, `buildAllDirectMessagesQuery()`, `buildAllChannelMessagesQuery()`, `buildLastReadQuery()` |
| `ConnectionRepository` | `buildConnectionsQuery()`, `buildConnectionQuery()`, `buildDefaultConnectionQuery()` |
| `ChannelRepository` | `buildChannelsQuery()`, `buildChannelQuery()`, `buildPrimaryChannelQuery()` |
| `PacketLogRepository` | `buildPacketLogsQuery()`, `buildSignalLogsQuery()` |
| `PreferencesRepository` | `buildPreferenceQuery()`, `buildAllPreferencesQuery()` |

**Dependency injection:** Each repository exposes `getClient(client?: SQLocalDrizzle)` for testing:
```typescript
// Production - uses default client
const { data } = useReactiveQuery(nodeRepo.getClient(), query);

// Testing - inject mock client
const { data } = useReactiveQuery(nodeRepo.getClient(mockClient), query);
```

## Feature Modules

### Connections (`src/features/connections/`)
- Device connection management (Bluetooth, Serial, HTTP)
- Connection status tracking
- Saved connections persistence

#### Connection Flow

The connections feature demonstrates the **Service + Hook** pattern used throughout the app for managing imperative, stateful operations.

**ConnectionService** (`services/ConnectionService.ts`) - A singleton class handling all **imperative work**:
- **Transport lifecycle** - Creating/destroying serial, bluetooth, and HTTP transports
- **MeshDevice management** - Creating MeshDevice instances, subscribing to device events
- **Connection state machine** - Managing status transitions (connecting → configuring → connected)
- **Event subscriptions** - Subscribing to `onMyNodeInfo`, `onConfigPacket`, `onConfigComplete`, etc.
- **Heartbeat management** - Starting/stopping heartbeat intervals
- **Cache logic** - Checking for cached config/nodes for fast reconnection
- **Database updates** - Updating connection status via repositories

**useConnections** (`hooks/useConnections.ts`) - A React hook providing a **reactive interface**:
- **React state synchronization** - Using `useSyncExternalStore` to subscribe to changes
- **Exposing actions** - Wrapping ConnectionService methods in React-friendly callbacks
- **Data fetching** - Refreshing connection list from the database
- **Cache management** - Maintaining a local cache for synchronous React rendering

```
┌─────────────────────┐     ┌──────────────────────┐     ┌─────────────────┐
│   React Component   │────▶│    useConnections    │────▶│ ConnectionService│
│  (ConnectionsPage)  │     │       (hook)         │     │   (singleton)    │
└─────────────────────┘     └──────────────────────┘     └─────────────────┘
         ▲                           │                           │
         │                           │                           ▼
         │                           │                   ┌─────────────────┐
         │                           │                   │   MeshDevice    │
         │                           │                   │   Transport     │
         └───────────────────────────┘                   │   Database      │
              (state updates via                         └─────────────────┘
               useSyncExternalStore)
```

**Why this split:**
- **Testability** - ConnectionService can be tested without React
- **Separation of concerns** - Imperative I/O vs reactive UI
- **Lifecycle management** - Service persists across component mounts/unmounts
- **Singleton pattern** - One connection manager, many observing components

### Messages (`src/features/messages/`)
- Chat interface for channel and direct messages
- Message drafts and delivery status
- Unread message tracking

### Nodes (`src/features/nodes/`)
- Node list with sorting and filtering
- Node details drawer with telemetry charts
- Signal metrics visualization
- Signal grading algorithm (matches Meshtastic firmware)

### Map (`src/features/map/`)
- Full map view with node markers
- Position trails and precision circles
- SNR visualization layer
- Waypoint management

### Preferences (`src/features/preferences/`)
- App-level user preferences
- Theme and language settings

### Settings (`src/features/settings/`)
- Device configuration forms
- Module configuration
- Validation schemas (Zod)
- Field change tracking

## Signal Grading Algorithm

The signal grading logic (`src/features/nodes/utils/signalColor.ts`) matches Meshtastic firmware:

```typescript
function getSignalGrade(snr: number, rssi: number, snrLimit: number): SignalGradeResult {
  if (snr > snrLimit && rssi > -10)  return { grade: "Good", bars: 5 };
  if (snr > snrLimit && rssi > -20)  return { grade: "Good", bars: 4 };
  if (snr > 0 && rssi > -50)         return { grade: "Good", bars: 3 };
  if (snr > -10 && rssi > -100)      return { grade: "Fair", bars: 2 };
  return { grade: "Bad", bars: 1 };
}
```

SNR limits vary by modem preset:
- Long range presets: -6.0 dB
- Medium range presets: -5.5 dB
- Short range presets: -4.5 dB

## Routes

Routes are organized around the connected device's `nodeNum`:

| Path | Component | Description |
|------|-----------|-------------|
| `/connect` | `ConnectPage` | Device connection management |
| `/$nodeNum/messages` | `MessagesPage` | Chat interface (channel/direct) |
| `/$nodeNum/map` | `MapPage` | Full map view with nodes |
| `/$nodeNum/map/$long/$lat/$zoom` | `MapPage` | Map with specific coordinates |
| `/$nodeNum/nodes` | `NodesPage` | Node list with signal/telemetry |
| `/$nodeNum/settings` | `SettingsPage` | Device configuration |
| `/$nodeNum/settings/radio` | `RadioConfig` | LoRa settings |
| `/$nodeNum/settings/device` | `DeviceConfig` | Device settings |
| `/$nodeNum/settings/module` | `ModuleConfig` | Module configuration |

Routes under `/$nodeNum/*` require a valid device and redirect to `/connect` if the device doesn't exist.

## Development

```bash
# Install dependencies
pnpm install

# Start dev server
pnpm dev

# Type checking
pnpm typecheck

# Run tests
pnpm test

# Build for production
pnpm build

# Database migrations
pnpm db:generate  # Generate migrations from schema
pnpm db:check     # Validate migrations
```

## Design Patterns

| Pattern | Usage |
|---------|-------|
| **Feature-based Organization** | Colocated code by feature domain |
| **Repository with Query Builders** | Database access abstraction with reactive query support |
| **Factory** | Device store creation |
| **State Machine** | Drawer navigation, connection phases |
| **Observer** | Zustand subscriptions, event bus |
| **Lazy Loading** | Route-based code splitting with Suspense |
| **Reactive Queries** | `useReactiveQuery` for automatic UI updates on database changes |

## Code Standards

- No `any` types
- No non-null assertion operator (`!`)
- No type assertions (`as Type`)
- Use `isDefined()` type guard for null checks
- Prefer `flatMap` over `filter().map()` for type narrowing
- State machines over simple boolean state for complex UI

## Key Files Reference

| File | Purpose |
|------|---------|
| `src/app/routes.tsx` | Route definitions with guards |
| `src/data/schema.ts` | Database schema definitions |
| `src/state/device/store.ts` | Device state management |
| `src/state/ui/store.ts` | Ephemeral UI state and DEFAULT_PREFERENCES |
| `src/data/hooks/usePreferences.ts` | Preferences hook |
| `src/data/repositories/PreferencesRepository.ts` | Preferences persistence |
| `src/shared/hooks/useMyNode.ts` | Device context hooks (useMyNode, useNodeNum, useNodeNumSafe) |
| `src/features/nodes/utils/signalColor.ts` | Signal grading algorithm |
| `src/shared/utils/typeGuards.ts` | Type guard utilities |
| `src/core/services/adminMessageService.ts` | Admin message handling |
| `src/data/repositories/NodeRepository.ts` | Node data access |
| `src/shared/hooks/useFavoriteNode.ts` | Favorite node management |
