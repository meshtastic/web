# @meshtastic/transport-web-serial

[![JSR](https://jsr.io/badges/@meshtastic/transport-web-serial)](https://jsr.io/@meshtastic/transport-web-serial)
[![CI](https://img.shields.io/github/actions/workflow/status/meshtastic/js/ci.yml?branch=master&label=actions&logo=github&color=yellow)](https://github.com/meshtastic/js/actions/workflows/ci.yml)
[![CLA assistant](https://cla-assistant.io/readme/badge/meshtastic/meshtastic.js)](https://cla-assistant.io/meshtastic/meshtastic.js)
[![Fiscal Contributors](https://opencollective.com/meshtastic/tiers/badge.svg?label=Fiscal%20Contributors&color=deeppink)](https://opencollective.com/meshtastic/)
[![Vercel](https://img.shields.io/static/v1?label=Powered%20by&message=Vercel&style=flat&logo=vercel&color=000000)](https://vercel.com?utm_source=meshtastic&utm_campaign=oss)

## Overview

`@meshtastic/transport-web-serial` Provides Web Serial transport for Meshtastic
devices. Installation instructions are avaliable at
[JSR](https://jsr.io/@meshtastic/transport-web-serial)
[NPM](https://www.npmjs.com/package/@meshtastic/transport-web-serial)

## Usage

```ts
import { MeshDevice } from "@meshtastic/core";
import { TransportWebSerial } from "@meshtastic/transport-web-serial";

const transport = await TransportWebSerial.create();
const device = new MeshDevice(transport);
```

## Stats

![Alt](https://repobeats.axiom.co/api/embed/5330641586e92a2ec84676fedb98f6d4a7b25d69.svg "Repobeats analytics image")

### Compatibility

The Web Serial API's have limited support in browsers, compatibility is
represented in the matrix below.

![Web Serial compatability matrix](https://caniuse.bitsofco.de/image/web-serial.png)
