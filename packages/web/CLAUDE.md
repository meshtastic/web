# Meshtastic Web: Codebase Documentation

## Overview

Meshtastic Web is the official web client for [Meshtastic](https://meshtastic.org) mesh radio networks. This document serves as an AI assistant reference covering approximately 46,000 lines of TypeScript/React code across 270+ files. The client enables users to configure devices, send messages, view nodes on a map, and monitor mesh network health.

**Live instances:**
- Production: [client.meshtastic.org](https://client.meshtastic.org)
- Staging: [client-test.meshtastic.org](https://client-test.meshtastic.org)

## Core Architecture

The application follows a layered architecture:

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
├── components/           # React components
│   ├── Dialog/          # Modal dialogs and drawers
│   │   └── NodeDetailsDrawer/  # Node info drawer with signal/telemetry
│   ├── Form/            # Form components and utilities
│   ├── generic/         # Reusable components (SignalIndicator, TimeAgo)
│   ├── PageComponents/  # Page-specific components
│   ├── Settings/        # Settings page components
│   └── ui/              # shadcn/ui primitives
├── core/
│   ├── dto/             # Data transfer objects
│   ├── hooks/           # Custom React hooks
│   ├── services/        # Business logic services
│   ├── stores/          # Zustand stores
│   └── utils/           # Utility functions
├── db/
│   ├── hooks/           # Database query hooks
│   ├── migrations/      # SQL migrations
│   └── repositories/    # Data access layer
├── pages/               # Route page components
└── validation/          # Zod schemas for config validation
```

## Key Components

### State Management

**deviceStore** (`src/core/stores/deviceStore/index.ts`)
- Manages connected Meshtastic devices
- Tracks connection phase: `disconnected → connecting → configuring → connected → configured`
- Stores device config, module config, and ephemeral state
- Handles change tracking for settings forms

**uiStore** (`src/core/stores/uiStore/index.ts`)
- User preferences (theme, language, units)
- UI state (dialog visibility, selected nodes)
- Node table column visibility and ordering

### Database Layer

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

Data access is abstracted through repositories:
- `MessageRepository` - Message CRUD with conversation queries
- `NodeRepository` - Node upsert with position/telemetry updates
- `ChannelRepository` - Channel configuration management
- `ConnectionRepository` - Saved connection management

### New Components (Recent)

**NodeDetailsDrawer** (`src/components/Dialog/NodeDetailsDrawer/`)
- Comprehensive node information panel
- State machine for drawer navigation (`main` → `signal-log`)
- Lazy-loaded sub-pages with Suspense boundaries

**SignalIndicator** (`src/components/generic/SignalIndicator.tsx`)
- 5-bar signal strength visualization
- Uses firmware-matching grading algorithm
- Color-coded: Good (green), Fair (yellow), Bad (orange)

**SignalMetricsLog** (`src/components/Dialog/NodeDetailsDrawer/SignalMetricsLog.tsx`)
- Historical signal metrics chart
- Time range selector (24H, 48H, 1W, 2W, 4W, Max)
- Dual-axis chart showing RSSI and SNR

**TelemetryChart** (`src/components/Dialog/NodeDetailsDrawer/TelemetryChart.tsx`)
- Battery, voltage, temperature, humidity charts
- Custom SVG line charts (no external charting library)

**MiniMap** (`src/components/Dialog/NodeDetailsDrawer/MiniMap.tsx`)
- Compact MapLibre map for node position preview

## Signal Grading Algorithm

The signal grading logic matches Meshtastic firmware (`src/core/utils/signalColor.ts`):

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

## Hooks Architecture

Hooks are organized by their data source and responsibility:

### Database Hooks (`src/db/hooks/`)

Hooks that abstract database access live in `src/db/hooks/`. These provide reactive subscriptions to SQLite data and handle query logic:

| Hook | Purpose |
|------|---------|
| `useNodes` | Subscribe to node updates with filtering |
| `useMessages` | Subscribe to messages for a conversation |
| `useChannels` | Subscribe to channel configuration |
| `useConnections` | Subscribe to saved connections |
| `useSignalLogs` | Query packet logs for signal history |
| `usePacketLogs` | Query raw packet logs |
| `usePreferences` | Read/write user preferences |
| `useDevicePreference` | Device-specific preferences |
| `useMessageDraft` | Per-conversation draft persistence |
| `useUnreadCount` | Unread message counts |

### Core Hooks (`src/core/hooks/`)

General-purpose hooks that handle UI logic, browser APIs, and device interactions:

| Hook | Purpose |
|------|---------|
| `useGetMyNode` | Get current device's node from database |
| `useTraceroute` | Manage traceroute requests with progress |
| `useFavoriteNode` | Toggle node favorite status |
| `useIgnoreNode` | Toggle node ignore status |
| `useTheme` | Theme switching (light/dark/system) |
| `useLang` | Language/locale management |
| `useIsMobile` | Responsive breakpoint detection |
| `useCopyToClipboard` | Clipboard API wrapper |
| `useDebounce` | Debounced value updates |
| `useLocalStorage` | LocalStorage with React state |

## Validation Schemas

Zod schemas in `src/validation/` validate device configuration:

```
validation/
├── config/
│   ├── bluetooth.ts
│   ├── device.ts
│   ├── display.ts
│   ├── lora.ts
│   ├── network.ts
│   ├── position.ts
│   ├── power.ts
│   └── security.ts
└── moduleConfig/
    ├── mqtt.ts
    ├── telemetry.ts
    ├── serial.ts
    └── ... (12 modules)
```

## Internationalization

Supports 20+ languages via i18next:
- Translations in `public/i18n/locales/{lang}/`
- Organized by feature: `ui.json`, `nodes.json`, `messages.json`, etc.
- Crowdin integration for community translations

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
| **Repository** | Database access abstraction |
| **Factory** | Device store creation |
| **State Machine** | Drawer navigation, connection phases |
| **Observer** | Zustand subscriptions, event bus |
| **Lazy Loading** | Route-based code splitting with Suspense |

## Code Standards

From project CLAUDE.md:
- No `any` types
- No non-null assertion operator (`!`)
- No type assertions (`as Type`)
- Use `isDefined()` type guard for null checks
- Prefer `flatMap` over `filter().map()` for type narrowing
- State machines over simple boolean state for complex UI

## Key Files Reference

| File | Purpose |
|------|---------|
| `src/routes.tsx` | Route definitions with guards |
| `src/db/schema.ts` | Database schema definitions |
| `src/core/stores/deviceStore/index.ts` | Device state management |
| `src/core/stores/uiStore/index.ts` | UI preferences and state |
| `src/core/utils/signalColor.ts` | Signal grading algorithm |
| `src/core/utils/typeGuards.ts` | Type guard utilities |
| `src/DeviceWrapper.tsx` | Device context provider |
