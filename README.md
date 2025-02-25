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
The base image used is [Nginx 1.27](https://hub.docker.com/_/nginx)

```bash
# With Docker
docker run -d -p 8080:8080 --restart always --name Meshtastic-Web ghcr.io/meshtastic/web

#With Podman
podman run -d -p 8080:8080 --restart always --name Meshtastic-Web ghcr.io/meshtastic/web
```

## Nightly releases 

Our nightly releases provide the latest development builds with cutting-edge features and fixes. These builds are automatically generated from the latest main branch every night and are available for testing and early adoption.

```bash
# With Docker
docker run -d -p 8080:8080 --restart always --name Meshtastic-Web ghcr.io/meshtastic/web:nightly
#With Podman
podman run -d -p 8080:8080 --restart always --name Meshtastic-Web ghcr.io/meshtastic/web:nightly
```

[!WARNING] 
 - Nightly builds represent the latest development state and may contain breaking changes
 - These builds undergo automated testing but may be less stable than tagged release versions
 - Not recommended for production environments unless you are actively testing new features
 - No guarantee of backward compatibility between nightly builds

### Version Information
Each nightly build is tagged with:

- The nightly tag for the latest build
- A specific SHA for build reproducibility

### Feedback
If you encounter any issues with nightly builds, please report them in our [issues tracker](https://github.com/meshtastic/web/issues). Your feedback helps improve the stability of future releases

## Development & Building
You'll need to download the package manager used with this repo. You can install it by visiting [Bun.sh](https://bun.sh/) and following the installation instructions. 

### Building and Packaging

Build the project:

```bash
bun run build
```

GZip the output:

```bash
bun run package
```

### Development

Install the dependencies.

```bash
bun i
```

Start the development server:

```bash
bun run dev
```
