# Contributing to the Meshtastic Web Client

Thanks for your interest in contributing! The full contributor guide lives in
the web app package:

- **[Contributing guide](apps/web/CONTRIBUTING.md)** — development setup, branch
  and commit conventions, and the review process
- **[i18n developer guide](apps/web/CONTRIBUTING_I18N_DEVELOPER_GUIDE.md)** —
  adding translation keys when you touch user-facing strings
- **[Translation guide](apps/web/CONTRIBUTING_TRANSLATIONS.md)** — contributing
  translations via Crowdin
- **[Testing guide](TESTING.md)** — unit tests and the end-to-end device suite
- **[Code of Conduct](CODE_OF_CONDUCT.md)**
- **[Security policy](.github/SECURITY.md)** — please report vulnerabilities
  privately

## Quick start

```bash
pnpm install
pnpm --filter ./apps/web dev
```

Before opening a pull request:

```bash
pnpm run check:fix                       # lint + format
pnpm exec vitest run                     # unit tests
pnpm --filter ./apps/web run typecheck   # types
```

CI runs the same lint, format, typecheck, test, and build steps, so running
them locally first is the fastest way to a green PR.

> This file is a pointer so GitHub surfaces contribution guidance from the
> repository root. Substantive guidance belongs in
> [apps/web/CONTRIBUTING.md](apps/web/CONTRIBUTING.md).
