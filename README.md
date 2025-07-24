# Meshtastic Web Monorepo

[![CI](https://img.shields.io/github/actions/workflow/status/meshtastic/web/ci.yml?branch=main&label=Web%20CI&logo=github&color=yellow)](https://github.com/meshtastic/web/actions/workflows/ci.yml)
[![CI](https://img.shields.io/github/actions/workflow/status/meshtastic/js/ci.yml?branch=master&label=JS%20CI&logo=github&color=yellow)](https://github.com/meshtastic/js/actions/workflows/ci.yml)
[![CLA assistant](https://cla-assistant.io/readme/badge/meshtastic/web)](https://cla-assistant.io/meshtastic/web)
[![Fiscal Contributors](https://opencollective.com/meshtastic/tiers/badge.svg?label=Fiscal%20Contributors&color=deeppink)](https://opencollective.com/meshtastic/)
[![Vercel](https://img.shields.io/static/v1?label=Powered%20by&message=Vercel&style=flat&logo=vercel&color=000000)](https://vercel.com?utm_source=meshtastic&utm_campaign=oss)

## Overview

This monorepo consolidates the official [Meshtastic](https://meshtastic.org) web
interface and its supporting JavaScript libraries. It aims to provide a unified
development experience for interacting with Meshtastic devices.

### Projects within this Monorepo (`packages/`)

All projects are located within the `packages/` directory:

- **`packages/web` (Meshtastic Web Client):** The official web interface,
  designed to be hosted or served directly from a Meshtastic node.
  - **[Hosted version](https://client.meshtastic.org)**
- **`packages/core`:** Core functionality for Meshtastic JS.
- **`packages/transport-node`:** TCP Transport for the NodeJS runtime.
- **`packages/transport-deno`:** TCP Transport for the Deno runtime.
- **`packages/transport-http`:** HTTP Transport.
- **`packages/transport-web-bluetooth`:** Web Bluetooth Transport.
- **`packages/transport-web-serial`:** Web Serial Transport.

All `Meshtastic JS` packages (core and transports) are published both to
[JSR](https://jsr.io/@meshtastic). [NPM](https://www.npmjs.com/org/meshtastic)

---

## Stats

| Project        | Repobeats                                                                                                             |
| :------------- | :-------------------------------------------------------------------------------------------------------------------- |
| Meshtastic Web | ![Alt](https://repobeats.axiom.co/api/embed/e5b062db986cb005d83e81724c00cb2b9cce8e4c.svg "Repobeats analytics image") |

---

## Tech Stack

This monorepo leverages the following technologies:

- **Runtime:** Bun
- **Web Client:** React.js
- **Styling:** Tailwind CSS
- **Bundling:** Vite
- **Language:** TypeScript
- **Testing:** Vitest, React Testing Library

---

## Getting Started

### Prerequisites

You'll need to have [Bun](https://bun.sh/) installed to work with this monorepo.
Follow the installation instructions on their home page.

### Development Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/meshtastic/meshtastic-web.git
   cd meshtastic-web
   ```
2. **Install dependencies for all packages:**
   ```bash
   bun install
   ```
   This command installs all necessary dependencies for all packages within the
   monorepo.

### Running Projects

#### Meshtastic Web Client

To start the development server for the web client:

```bash
cd ./packages/web && bun run dev
```

This will typically run the web client on http://localhost:3000 and requires a
Chromium browser

### Feedback

If you encounter any issues with nightly builds, please report them in our
[issues tracker](https://github.com/meshtastic/web/issues). Your feedback helps
improve the stability of future releases

### Why Bun?

Meshtastic Web uses Bun as its development platform for several compelling
reasons:

- **Fast Performance**: Bun is built from the ground up for speed, offering
  significantly faster package installation and bundling compared to other
  JavaScript runtimes.
- **TypeScript Support**: Native TypeScript support without additional
  configuration, enhancing code quality and developer experience.
- **Modern JavaScript**: First-class support for ESM imports, top-level await,
  and other modern JavaScript features.
- **All-in-One Tooling**: Built-in package manager, bundler, test runner, and
  transpiler eliminate the need for multiple third-party tools.
- **Node.js Compatibility**: Drop-in replacement for Node.js with better
  performance and built-in tooling.
- **Reproducible Builds**: Lockfile ensures consistent builds across all
  environments.

### Contributing

We welcome contributions! Here’s how the deployment flow works for pull
requests:

- **Preview Deployments:**\
  Every pull request automatically generates a preview deployment on Vercel.
  This allows you and reviewers to easily preview changes before merging.

- **Staging Environment (`client-test`):**\
  Once your PR is merged, your changes will be available on our staging site:
  [client-test.meshtastic.org](https://client-test.meshtastic.org/).\
  This environment supports rapid feature iteration and testing without
  impacting the production site.

- **Production Releases:**\
  At regular intervals, stable and fully tested releases are promoted to our
  production site: [client.meshtastic.org](https://client.meshtastic.org/).\
  This is the primary interface used by the public to connect with their
  Meshtastic nodes.

Please review our
[Contribution Guidelines](https://github.com/meshtastic/web/blob/main/CONTRIBUTING.md)
before submitting a pull request. We appreciate your help in making the project
better!
