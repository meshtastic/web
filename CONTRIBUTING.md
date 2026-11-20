# Contributing to Meshtastic Web

Thank you for your interest in contributing to Meshtastic Web! We welcome contributions from everyone, whether that's fixing a typo, improving documentation, adding a feature, or reporting a bug. This document covers how to get started and the conventions we follow.

## How to Contribute

- **Fork the repository** and create your branch from `main`.
- **Keep each change focused**: one concern per commit, one feature or fix per PR.
- **Test your changes** thoroughly before submitting a pull request.
- **Submit a pull request** with a clear description of your changes and the problem they solve.
- If you are addressing an existing issue, reference it in your PR (for example, `Fixes #123`).
- For larger changes, talk to the team on [Discord](https://discord.gg/meshtastic) before starting work, or open a draft PR for early feedback.

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) 24 (the version in `.nvmrc`, which CI uses)
- [pnpm](https://pnpm.io/), the version pinned in the root `package.json` `packageManager` field. Corepack picks it up automatically.
- **JDK 21**, to build `@meshtastic/sdk-kmp`, the Kotlin Multiplatform SDK compiled to JavaScript. On macOS: `brew install openjdk@21` and `export JAVA_HOME=/opt/homebrew/opt/openjdk@21`. The Gradle wrapper is committed, so Gradle downloads itself on first use.
- [Buf CLI](https://buf.build/docs/cli/installation/), only needed to build `@meshtastic/protobufs` (for example a full `pnpm -r build`). It isn't needed to run the dev server.
- Git

### Installation

Clone the repo and install dependencies:

```bash
git clone --recurse-submodules https://github.com/meshtastic/web.git meshtastic-web
cd meshtastic-web
pnpm install
```

The SDK is built from source out of the `packages/sdk-kmp/vendor/meshtastic-sdk` submodule. If you cloned without `--recurse-submodules`, the SDK build initialises the submodule for you.

### Development

Start the development server:

```bash
pnpm --filter meshtastic-web dev
```

The first run builds `@meshtastic/sdk-kmp` (this needs JDK 21 and takes a few minutes); later runs reuse the build. Once running, the site is available at **http://localhost:3000**.

## Repository Structure

Meshtastic Web is a monorepo managed with pnpm workspaces:

```
/apps
  └─ web          # React web client
/packages
  ├─ sdk-kmp      # The Kotlin Multiplatform meshtastic-sdk compiled to JS, plus the
  │               # Kotlin/JS facade and browser transports the web client talks to
  ├─ protobufs    # Generated TypeScript protobuf stubs (via buf generate)
  └─ ui           # Shared Radix + Tailwind component library
```

The web client uses the same [meshtastic-sdk](https://github.com/meshtastic/meshtastic-sdk) as the Android, iOS and Desktop apps, so mesh and connection behaviour (handshake, reconnect, node database, admin) lives in the SDK. Changes to that behaviour belong upstream in `meshtastic/meshtastic-sdk`; this repo owns the JS facade and the UI. See [`packages/sdk-kmp/README.md`](./packages/sdk-kmp/README.md) for details.

## Code Style

- Code is linted with [oxlint](https://oxc.rs/docs/guide/usage/linter) and formatted with [oxfmt](https://oxc.rs/docs/guide/usage/formatter). A pre-commit hook (husky + lint-staged) runs both on staged files, but run the full checks yourself before you push:

  ```bash
  pnpm check      # oxlint + oxfmt --check (CI runs this)
  pnpm check:fix  # auto-fix lint and formatting issues
  ```

- Write clear, descriptive variable and function names.
- Add comments where necessary, especially for complex logic.
- Keep functions and components focused and concise.
- **Strings:** don't hardcode user-facing English in components. See [Internationalization](#internationalization-i18n) below.

## Internationalization (i18n)

Meshtastic Web supports multiple languages. If your changes introduce **new user-facing strings**:

- Add them to the matching namespace file in **`apps/web/public/i18n/locales/en/`** (for example `common.json`, `ui.json`). See the namespace rules in the i18n Developer Guide.
- Do **not** hardcode English strings directly in components, so they can be translated into other languages.

See these guides for more details:

- [i18n Developer Guide](./CONTRIBUTING_I18N_DEVELOPER_GUIDE.md)
- [Translation Contribution Guide](./CONTRIBUTING_TRANSLATIONS.md)

## Testing

Unit and component tests are written with [Vitest](https://vitest.dev/). [TESTING.md](./TESTING.md) describes which tier a test belongs in; add coverage at the lowest tier that catches the regression.

- Add or update tests for any new feature or bug fix.
- Make sure everything passes:
  - `pnpm test` for all Vitest suites, from the repo root
  - `pnpm --filter meshtastic-web test` for only the web app's tests
  - `pnpm --filter meshtastic-web typecheck` for TypeScript
  - `pnpm --filter @meshtastic/sdk-kmp test` when touching `packages/sdk-kmp`
- End-to-end tests use [Playwright](https://playwright.dev/) against simulated `meshtasticd` nodes (`pnpm test:e2e`) and run in CI. They need extra setup (Docker and Python); see [`e2e/README.md`](./e2e/README.md).
- If your change is difficult to test, explain why in your pull request.

## Commit Messages

We use [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` a new feature
- `fix:` a bug fix
- `docs:` documentation changes
- `chore:` maintenance, dependencies, build scripts
- `refactor:` code restructuring without feature changes
- `test:` adding or updating tests
- `ci:` CI/CD changes

Example:

```
feat: add toast notification system
fix: correct caching issue in storage service
```

## Pull Requests

- Branches use conventional-commit style prefixes, for example `feat/<topic>`:
  - `feat/`: new user-visible behaviour
  - `fix/`: bug fixes
  - `chore/`: tooling, dependencies, cleanup
  - `docs/`: documentation only
  - `build/`: build system changes
  - `ci/`: CI workflow changes
  - `refactor/`: code structure changes
  - `test/`: test additions or fixes
- Make sure your branch is up to date with `main` before submitting a PR.
- Give your PR a meaningful conventional-commit title and fill in the PR template.
- Include how to test or reproduce the change if it isn't obvious.
- Include logs where they show the behaviour, as a fenced code block rather than a screenshot of text. For UI changes, see [Screenshots](#screenshots) below.
- All CI checks (lint, format, tests and build) must pass before merge.
- Be responsive to feedback and make requested changes promptly.
- Squash commits if a maintainer asks you to.

### Writing the description

- **Lead with why.** One or two sentences on the problem the change solves, before any list of what changed. If it addresses an issue, say `Fixes #123`.
- **Group what changed** under whichever of these apply, and omit the rest: 🌟 New Features · 🛠️ Refactoring & Architecture · 🐛 Bug Fixes · 🧹 Chores (dependencies, formatting, docs).
- **Call out architecture moves.** Logic moving out of the web client into the Kotlin SDK, or changes to the `sdk-kmp` facade's exported surface, are worth saying explicitly rather than leaving to the diff.
- **Fill in "Testing Done"** whenever tests were added or changed, listing them. If a change is hard to test, say why there instead.

### Screenshots

UI changes need images: anything touching components, layouts, theming or navigation. Use a Before / After table for a visual change or fix:

| Before | After |
|--------|-------|
| <img src="<url>" width="300"/> | <img src="<url>" width="300"/> |

Paste or drag images directly into the PR so GitHub hosts them, or reference a committed image by its **commit-SHA** raw URL (`https://raw.githubusercontent.com/<owner>/<repo>/<sha>/<path>`, spaces encoded as `%20`) so the link survives the branch being deleted. Don't use an external image service, and don't use placeholder images. If you don't have a screenshot yet, leave the template's screenshot section for later.

## Issue Reporting

- Search existing issues before opening a new one to avoid duplicates.
- Use the bug report or feature request template.
- Provide a clear and descriptive title.
- Include steps to reproduce, expected behaviour, and actual behaviour.
- Attach logs, screenshots, your browser and device firmware version, or other helpful context where it applies.

## Forks and rebrands

Meshtastic Web is GPL-3.0-only, so forking it, renaming it, and shipping it, free or paid, is allowed. The license and the [trademark policy](https://meshtastic.org/docs/legal/licensing-and-trademark/) set the conditions, and renaming, moving files, or rewriting code does not remove them.

- **Keep the license.** Your version is GPL-3.0 with `LICENSE` intact. Publish the Corresponding Source of everything you distribute (section 6). Added restrictions, or distributing without source, terminate your rights under the license (section 8).
- **Keep the notices.** Keep existing copyright and license notices as they are. Say prominently that you modified the work, and when (section 5a).
- **Keep the legal notices in the app.** Keep the About page's copyright notice and its link to the source, with Meshtastic LLC still named (section 5d).
- **Leave the trademarks out of your branding.** The GPL is a copyright license and grants no trademark rights. The Meshtastic name and logo are trademarks of Meshtastic LLC. Do not use them in your app name, icon, page title, or domain, and do not imply that Meshtastic sponsors or endorses your product. Replace the name in `apps/web/public/site.webmanifest` and the logo and icons in `apps/web/public/`.
- **Describe compatibility plainly.** "Works with Meshtastic® nodes" or "a fork of Meshtastic Web" is fine. Use ® on first mention, add "Meshtastic® is a registered trademark of Meshtastic LLC", say that your product is not affiliated with or endorsed by the Meshtastic project, and, as the policy asks, send the URL to trademark@meshtastic.org within seven days of first use.

Questions about any of this: trademark@meshtastic.org.

## Community Standards

- Be respectful and considerate in all interactions.
- Meshtastic Web is subject to the [Meshtastic Code of Conduct](https://meshtastic.org/docs/legal/conduct/).
- Help others by reviewing pull requests and answering questions when you can.
- Join the conversation on [Discord](https://discord.gg/meshtastic) and [GitHub Discussions](https://github.com/meshtastic/web/discussions).

## License

By contributing, you agree that your contributions will be licensed under the [GPL-3.0-only License](./LICENSE).

Thank you for helping make Meshtastic Web better!
