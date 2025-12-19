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
│   │   ├── components/          # AddConnectionDialog, etc.
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
│   │   ├── components/          # NodeDetailsDrawer, SignalMetricsLog, TelemetryChart
│   │   ├── hooks/               # useNodes
│   │   └── utils/               # nodeSort, signalColor
│   │
│   ├── map/                     # Map feature
│   │   ├── pages/               # MapPage
│   │   └── components/          # Map, Layers/, Markers/, Popups/, Tools/
│   │
│   └── settings/                # Settings feature
│       ├── pages/               # SettingsPage, RadioConfig, DeviceConfig, ModuleConfig
│       ├── hooks/               # useChannelForm, useConfigForm, useDeviceForm, etc.
│       ├── components/
│       │   ├── panels/          # Bluetooth, Display, LoRa, Device/, Network/, Security/
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
│   │   └── generic/             # SignalIndicator, TimeAgo, Mono, OnlineIndicator
│   ├── hooks/                   # useDebounce, useCopyToClipboard, useIsMobile, etc.
│   ├── utils/                   # color, randId, typeGuards, cn
│   └── types/                   # Shared type definitions
│
├── state/                       # Global state management
│   ├── device/                  # Device store (Zustand)
│   │   ├── store.ts             # Device state, connection tracking
│   │   └── types.ts             # Device-related types
│   └── ui/                      # UI preferences store
│       └── index.ts             # Theme, language, column visibility
│
├── data/                        # Data layer
│   ├── schema.ts                # Drizzle ORM schema definitions
│   ├── client.ts                # SQLite client initialization
│   ├── repositories/            # Data access layer
│   │   ├── MessageRepository.ts
│   │   ├── NodeRepository.ts
│   │   ├── ChannelRepository.ts
│   │   ├── ConnectionRepository.ts
│   │   └── PacketLogRepository.ts
│   ├── hooks/                   # Remaining database hooks
│   │   ├── useChannels.ts
│   │   ├── usePreferences.ts
│   │   └── usePacketLogs.ts
│   └── migrations/              # SQL migration files
│
├── core/                        # Core utilities and services
│   ├── hooks/                   # Core hooks (useTraceroute, useFavoriteNode, etc.)
│   ├── services/                # Business logic services
│   │   ├── adminMessageService.ts
│   │   ├── configBackupService.ts
│   │   └── maintenanceService.ts
│   ├── stores/                  # Legacy store location (re-exports)
│   └── utils/                   # Core utilities (geo, string, bitwise, etc.)
│
├── components/                  # Remaining shared components
│   ├── Dialog/                  # Modal dialogs (PKIBackupDialog, etc.)
│   ├── generic/                 # Filter components, ActionItem
│   └── PageComponents/          # Remaining page-specific components
│       ├── Channels/            # Channel configuration components
│       └── Messages/            # Message-related components
│
├── pages/                       # Remaining standalone pages
│   ├── Preferences.tsx          # User preferences page
│   └── Statistics/              # Network statistics page
│
└── validation/                  # Shared validation schemas
    ├── channel.ts               # Channel validation
    ├── pskSchema.ts             # PSK validation helpers
    └── configBackup.ts          # Backup validation
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
| `@components/*` | `./src/components/*` |
| `@pages/*` | `./src/pages/*` |

## State Management

### Device Store (`src/state/device/store.ts`)
- Manages connected Meshtastic devices
- Tracks connection phase: `disconnected → connecting → configuring → connected → configured`
- Stores device config, module config, and ephemeral state
- Handles change tracking for settings forms

### UI Store (`src/state/ui/index.ts`)
- User preferences (theme, language, units)
- UI state (dialog visibility, selected nodes)
- Node table column visibility and ordering

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

## Feature Modules

### Connections (`src/features/connections/`)
- Device connection management (Bluetooth, Serial, HTTP)
- Connection status tracking
- Saved connections persistence

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

| Path | Component | Description |
|------|-----------|-------------|
| `/connections` | `Connections` | Device connection management |
| `/messages` | `MessagesPage` | Chat interface (channel/direct) |
| `/map` | `MapPage` | Full map view with nodes |
| `/map/$long/$lat/$zoom` | `MapPage` | Map with specific coordinates |
| `/nodes` | `NodesPage` | Node list with signal/telemetry |
| `/settings` | `SettingsPage` | Device configuration |
| `/settings/radio` | `RadioConfig` | LoRa settings |
| `/settings/device` | `DeviceConfig` | Device settings |
| `/settings/module` | `ModuleConfig` | Module configuration |
| `/statistics` | `StatisticsPage` | Network statistics |

Routes requiring an active connection redirect to `/connections` if disconnected.

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
| **Repository** | Database access abstraction |
| **Factory** | Device store creation |
| **State Machine** | Drawer navigation, connection phases |
| **Observer** | Zustand subscriptions, event bus |
| **Lazy Loading** | Route-based code splitting with Suspense |

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
| `src/state/ui/index.ts` | UI preferences and state |
| `src/features/nodes/utils/signalColor.ts` | Signal grading algorithm |
| `src/shared/utils/typeGuards.ts` | Type guard utilities |
| `src/DeviceWrapper.tsx` | Device context provider |
