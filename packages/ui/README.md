# @meshtastic/ui

Shared React component library used by [`@meshtastic/web`](../../apps/web). Radix Primitives + Tailwind CSS v4 with a shadcn-flavoured design system.

## What's inside

- **`AppSidebar`** — top-level layout sidebar used by the web client shell.
- **`ThemeProvider` + `useTheme` + `ThemeToggle`** — light/dark/system theme, persisted to `localStorage`.
- **`Badge`** — primitive re-exported at the package root.
- **`theme/default.css`** — Tailwind design tokens (colors, radii, typography) shipped as a standalone stylesheet.
- **shadcn primitives** under `src/components/ui/` (`Button`, `Input`, `Collapsible`, `DropdownMenu`, `Separator`, `Sheet`, `Skeleton`, `Tooltip`) — bundled but only re-exported through the sidebar surface today. Deep-imports work against the built `dist/`.

The package is framework-agnostic within React 19: no device, transport, or SDK dependencies. It only owns look-and-feel.

## Install

```sh
pnpm add @meshtastic/ui
```

Peer dependencies: `react` >=19, `react-dom` >=19, `tailwindcss` ^4.1, `@radix-ui/react-slot`, `class-variance-authority`, `tailwind-merge`.

## Usage

Import the theme stylesheet once at your app entry, then consume components:

```tsx
import "@meshtastic/ui/theme/default.css";
import { AppSidebar, Badge, ThemeProvider, ThemeToggle } from "@meshtastic/ui";

export function App() {
  return (
    <ThemeProvider defaultTheme="system">
      <AppSidebar sections={[]} />
      <Badge>online</Badge>
      <ThemeToggle />
    </ThemeProvider>
  );
}
```

## Development

From the repo root:

```sh
pnpm --filter @meshtastic/ui dev      # vite dev server
pnpm --filter @meshtastic/ui build    # vite build + publint
pnpm --filter @meshtastic/ui test     # vitest
```

## License

GPL-3.0-only.
