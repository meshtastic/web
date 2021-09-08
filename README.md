# Meshtastic Web

[![Open in Visual Studio Code](https://open.vscode.dev/badges/open-in-vscode.svg)](https://open.vscode.dev/meshtastic/meshtastic-web)

## Overview

Official [Meshtastic](https://meshtastic.org) web interface, that can be run independently or on a node

## Development & Building

### Building and Packaging

Build the project:

```bash
pnpm build
```

GZip the output:

```bash
pnpm package
```

### Development

Create a `.env` file:

```bash
cp ./.env.example ./.env
```

And define the device IP address in the `.env` file.

```
SNOWPACK_PUBLIC_DEVICE_IP=xxx.xxx.xxx.xxx
```

Install the dependencies.

```bash
pnpm i
```

Start the developtment server:

```bash
pnpm start
```
