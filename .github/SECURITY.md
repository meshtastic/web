# Security Policy

## Supported Versions

Security fixes land on `main` and ship in the next release. Only the most
recent release and the `nightly` container image receive fixes; older tags are
not patched.

| Version                          | Supported          |
| -------------------------------- | ------------------ |
| Latest release / `stable` branch | :white_check_mark: |
| `nightly`                        | :white_check_mark: |
| Older tagged releases            | :x:                |

## Reporting a Vulnerability

**Please do not open a public issue for security vulnerabilities.**

Report privately through GitHub Security Advisories:

<https://github.com/meshtastic/web/security/advisories/new>

Please include:

- A description of the issue and its impact
- Steps to reproduce, or a proof of concept
- The affected version, browser, and connection type (HTTP / Bluetooth / Serial)
- Any suggested mitigation

We aim to acknowledge reports within 7 days and to provide a remediation plan
within 30 days. We will credit you in the advisory unless you prefer otherwise.

## Scope

This repository is the Meshtastic **web client**. In scope:

- Cross-site scripting, injection, or other client-side vulnerabilities
- Mishandling of channel PSKs, private keys, or other device secrets
- Flaws in the Bluetooth, Serial, or HTTP transport implementations
- Supply-chain issues in this repository's build and release workflows

Out of scope — report these to the relevant repository instead:

- Device firmware: <https://github.com/meshtastic/firmware>
- Protocol design: <https://github.com/meshtastic/protobufs>
- Findings that require physical access to an already-unlocked device
- Vulnerabilities in the user's browser or operating system

## Handling Device Secrets

The web client handles channel pre-shared keys and node private keys. When
reporting an issue, please redact any real keys from logs, screenshots, and
reproduction steps.
