# Meshtastic Web

<!--Project specific badges here-->

[![CI](https://img.shields.io/github/actions/workflow/status/meshtastic/web/ci.yml?branch=master&label=actions&logo=github&color=yellow)](https://github.com/meshtastic/web/actions/workflows/ci.yml)
[![CLA assistant](https://cla-assistant.io/readme/badge/meshtastic/web)](https://cla-assistant.io/meshtastic/web)
[![Fiscal Contributors](https://opencollective.com/meshtastic/tiers/badge.svg?label=Fiscal%20Contributors&color=deeppink)](https://opencollective.com/meshtastic/)
[![Vercel](https://img.shields.io/static/v1?label=Powered%20by&message=Vercel&style=flat&logo=vercel&color=000000)](https://vercel.com?utm_source=meshtastic&utm_campaign=oss)

## Overview

Official [Meshtastic](https://meshtastic.org) web interface, that can be hosted or served from a node

**[Hosted version](https://client.meshtastic.org)**

## Stats

![Alt](https://repobeats.axiom.co/api/embed/e5b062db986cb005d83e81724c00cb2b9cce8e4c.svg "Repobeats analytics image")

## Self-host

The client can be self hosted using the precompiled container images with an OCI compatible runtime such as [Docker](https://www.docker.com/) or [Podman](https://podman.io/).
The base image used is [UBI9 Nginx 1.22](https://catalog.redhat.com/software/containers/ubi9/nginx-122/63f7653b9b0ca19f84f7e9a1)

```bash
# With Docker
docker run -d -p 8080:8080 -p 8443:8443 --restart always --name Meshtastic-Web ghcr.io/meshtastic/web

#With Podman
podman run -d -p 8080:8080 -p 8443:8443 --restart always --name Meshtastic-Web ghcr.io/meshtastic/web
```

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

Install the dependencies.

```bash
pnpm i
```

Start the development server:

```bash
pnpm dev
```
