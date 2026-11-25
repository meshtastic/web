# Meshtastic Web

The official [Meshtastic](https://meshtastic.org) web client: a React app that connects to a radio over its HTTP API, Web Serial or Web Bluetooth. It can be used hosted, self-hosted, or served from a node.

**[Open the hosted client](https://client.meshtastic.org)**

This is the `apps/web` package of the Meshtastic Web monorepo. For how the client talks to radios through the Kotlin meshtastic-sdk, and for setup and contribution guides, see the [repository README](../../README.md).

## Self-host

The client is published as a container image you can run with any OCI-compatible runtime, such as [Docker](https://www.docker.com/) or [Podman](https://podman.io/). The image serves the static build with nginx on port 8080.

```bash
# With Docker
docker run -d -p 8080:8080 --restart always --name Meshtastic-Web ghcr.io/meshtastic/web

# With Podman
podman run -d -p 8080:8080 --restart always --name Meshtastic-Web ghcr.io/meshtastic/web
```

Each GitHub release also attaches `build.tar`, the gzipped static build, for serving from your own web server.

## Releases

- **Versioning:** releases follow Semantic Versioning (`Major.Minor.Patch`) and are tagged on GitHub as `vX.Y.Z`. The client shows the version of the tag it was built from.
- **Image tags:** a stable release publishes `X.Y.Z`, `X.Y` and `X` tags; a pre-release publishes only its own version tag.
- **Nightly builds:** an image is built from `main` every night and tagged `nightly`, plus an immutable `nightly-<version or date>-<sha>` tag for reproducibility.

```bash
docker run -d -p 8080:8080 --restart always --name Meshtastic-Web ghcr.io/meshtastic/web:nightly
```

> [!WARNING]
> Nightly builds are the latest development state. They pass automated tests but may contain breaking changes, aren't guaranteed to be compatible with each other, and aren't recommended for production unless you are testing new features.

If you run into a problem, please report it in the [issue tracker](https://github.com/meshtastic/web/issues).

## Development

From the repository root (see the [repository README](../../README.md#getting-started) for prerequisites, including JDK 21 for the SDK build):

```bash
pnpm install
pnpm --filter meshtastic-web dev       # dev server at http://localhost:3000
pnpm --filter meshtastic-web dev:https # the same over HTTPS (run setup:certs first; needs mkcert)
pnpm --filter meshtastic-web test      # Vitest
pnpm --filter meshtastic-web typecheck # TypeScript
```

### Building and packaging

```bash
pnpm --filter meshtastic-web build         # production build into dist/
pnpm --filter meshtastic-web run package   # gzip the build and write dist/build.tar
```

To build the container image locally, build first, then run from the repository root (the Containerfile's paths are relative to it):

```bash
docker build -t meshtastic-web -f apps/web/infra/Containerfile .
```

## Deployment flow

- **Preview deployments:** every pull request gets a preview deployment on Vercel, so you and reviewers can try the change before it merges.
- **Staging (`web-staging`):** once merged, changes are available at [client.staging.meshtastic.org](https://client.staging.meshtastic.org/) for testing without affecting the production site.
- **Production:** stable releases are promoted to [client.meshtastic.org](https://client.meshtastic.org/), the site most people use to connect to their nodes.

Please read the [contribution guidelines](../../CONTRIBUTING.md) before opening a pull request.
