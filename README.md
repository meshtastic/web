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

> [!NOTE]
> You can find the main Meshtastic documentation at https://meshtastic.org/docs/introduction/.

### Projects within this Monorepo (`packages/`)

All projects are located within the `packages/` directory:

- **`packages/web` (Meshtastic Web Client):** The official web interface,
  designed to be hosted or served directly from a Meshtastic node.
  - **[Hosted version](https://client.meshtastic.org)**
- **`packages/core`:** Core functionality for Meshtastic JS.
- **`packages/transport-node`:** TCP Transport for the NodeJS runtime.
- **`packages/transport-node-serial`:** NodeJS Serial Transport for the NodeJS runtime.
- **`packages/transport-deno`:** TCP Transport for the Deno runtime.
- **`packages/transport-http`:** HTTP Transport.
- **`packages/transport-web-bluetooth`:** Web Bluetooth Transport.
- **`packages/transport-web-serial`:** Web Serial Transport.
- **`packages/protobufs`:** Git submodule containing Meshtastic’s shared protobuf definitions, used to generate and publish the JSR protobuf package.

All `Meshtastic JS` packages (core and transports) are published both to
[JSR](https://jsr.io/@meshtastic). [NPM](https://www.npmjs.com/org/meshtastic)

---

## Repository activity

| Project        | Repobeats                                                                                                             |
| :------------- | :-------------------------------------------------------------------------------------------------------------------- |
| Meshtastic Web | ![Alt](https://repobeats.axiom.co/api/embed/e5b062db986cb005d83e81724c00cb2b9cce8e4c.svg "Repobeats analytics image") |

---

## Tech Stack

This monorepo leverages the following technologies:

- **Runtime:** pnpm / Deno
- **Web Client:** React.js
- **Styling:** Tailwind CSS
- **Bundling:** Vite
- **Language:** TypeScript
- **Testing:** Vitest, React Testing Library

---

## Getting Started

### Prerequisites

You'll need to have [pnpm](https://pnpm.io/) installed to work with this monorepo.
Follow the installation instructions on their home page.

### Development Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/meshtastic/meshtastic-web.git
   cd meshtastic-web
   ```
2. **Install dependencies for all packages:**
   ```bash
   pnpm install
   ```
   This command installs all necessary dependencies for all packages within the
   monorepo.

### Running Projects

#### Meshtastic Web Client

Please refer to the [Meshtastic Web README](packages/web/README.md) for setup and usage.

### Feedback

If you encounter any issues, please report them in our
[issues tracker](https://github.com/meshtastic/web/issues). Your feedback helps
improve the stability of future releases

## Star history

<a href="https://star-history.com/#meshtastic/web&Date">
 <picture>
   <source media="(prefers-color-scheme: dark)" srcset="https://api.star-history.com/svg?repos=meshtastic/web&type=Date&theme=dark" />
   <source media="(prefers-color-scheme: light)" srcset="https://api.star-history.com/svg?repos=meshtastic/web&type=Date" />
   <img alt="Star History Chart" src="https://api.star-history.com/svg?repos=meshtastic/web&type=Date" width="100%" />
 </picture>
</a>

## Contributors

<a href="https://github.com/meshtastic/web/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=meshtastic/web" width="100%"/>
</a>
