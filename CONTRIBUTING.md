# Contributing to Meshtastic Web

Thank you for your interest in contributing to **Meshtastic Web**! 🎉  
We welcome all contributions—whether it’s fixing a typo, improving documentation, adding new features, or reporting bugs. This document outlines how to get started and the conventions we follow.

---

## 📋 Code of Conduct
We follow the [Meshtastic Code of Conduct](https://meshtastic.org/docs/legal/conduct/).  
Please make sure you are familiar with it before contributing.

---

## 🚀 Getting Started
Before making changes, please take some time to explore the repository and its monorepo structure. 
Understanding how the packages are organized will make it much easier to contribute effectively.

[Meshtastic Web](https://github.com/meshtastic/web/)

### Prerequisites
- [Node.js](https://nodejs.org/) (v24, the version CI uses)  
- [pnpm](https://pnpm.io/) (the version pinned in the root `package.json` `packageManager` field; Corepack picks it up automatically)  
- [Buf CLI](https://buf.build/docs/cli/installation/) (only needed to build `@meshtastic/protobufs`, e.g. a full `pnpm -r build`; not needed to run the dev server once the stubs are generated)  
- Git  

### Installation
Clone the repo and install dependencies:

```bash
git clone https://github.com/meshtastic/web.git meshtastic-web
cd meshtastic-web
pnpm install
```

### Development
Start the development server:

```bash
pnpm --filter meshtastic-web dev
```

Once running, the site will be available at:  
👉 **http://localhost:3000**

---

## 🗂 Repository Structure
Meshtastic Web uses a **monorepo** setup managed with **pnpm workspaces**:

```
/apps
  └─ web          # React reference web client
/packages
  ├─ sdk          # Framework-agnostic TypeScript SDK
  ├─ sdk-react    # React hooks + MeshProvider on top of @meshtastic/sdk
  ├─ ui           # Shared Radix + Tailwind component library
  ├─ sdk-storage-sqlocal  # SQLite WASM (OPFS) persistence adapters for the SDK
  ├─ protobufs    # Generated TypeScript stubs (via buf generate)
  ├─ transport-*  # Runtime-specific transport packages
  └─ ...other packages
```

---

## ✅ Contribution Workflow

1. **Fork the repo** and create your branch from `main`.  

   ### Branch Naming
   - Use [Conventional Commit](https://www.conventionalcommits.org/) style for your branch names:
     ```
     feat/add-project-filter
     fix/storage-service
     chore/update-ci-cache
     ```

2. **Make your changes locally** and verify that the app runs as expected at `http://localhost:3000`.  

3. **Lint, format and test** before you push. A pre-commit hook (husky + lint-staged) runs oxlint and oxfmt on staged files, but run the full checks yourself too:

   ```bash
   pnpm check      # oxlint + oxfmt --check (CI runs this)
   pnpm check:fix  # auto-fix lint and formatting issues
   pnpm test       # Vitest
   ```

4. **Commit your changes** with a descriptive commit message that follows the [Conventional Commits](https://www.conventionalcommits.org/) style.  

5. **Open a Pull Request (PR)** from your fork's branch to the main repository's `main` branch on GitHub:
   - Clearly describe the problem and solution.  
   - Reference related issues (e.g., `Fixes #123`).  
   - Keep PRs focused on a single feature or fix.  
   - Complete all fields in the PR template.
   - Tag a **Meshtastic Web developer** in the PR for review.  

6. **CI/CD**:
   - Our GitHub Actions workflows handle builds, linting, formatting, tests, and packaging automatically.  
   - All checks must pass before merge.  

---

## 🌍 Internationalization (i18n)

Meshtastic Web supports multiple languages. If your changes introduce **new user-facing strings**:

- Add them to the matching namespace file in **`apps/web/public/i18n/locales/en/`** (e.g. `common.json`, `ui.json`). See the namespace rules in the i18n Developer Guide below.  
- Do **not** hardcode English strings directly in components.  
- This ensures they can be translated into other languages.  

🔗 See these guides for more details:  
- [i18n Developer Guide](./CONTRIBUTING_I18N_DEVELOPER_GUIDE.md)  
- [Translation Contribution Guide](./CONTRIBUTING_TRANSLATIONS.md)  

---

## 🧪 Testing
Unit and component tests are written with [Vitest](https://vitest.dev/).  

Run all tests locally from the repo root with:  

```bash
pnpm test
```

To run only the web app's tests:  

```bash
pnpm --filter meshtastic-web test
```

End-to-end tests use [Playwright](https://playwright.dev/) against simulated `meshtasticd` nodes (`pnpm test:e2e`) and run in CI. They need extra setup (Docker and Python); see [`e2e/README.md`](./e2e/README.md).  

Please include tests for new features and bug fixes whenever possible.

---

## 📝 Commit Messages
We use **Conventional Commits**:

- `feat:` – a new feature  
- `fix:` – a bug fix  
- `docs:` – documentation changes  
- `chore:` – maintenance, dependencies, build scripts  
- `refactor:` – code restructuring without feature changes  
- `test:` – adding or updating tests  
- `ci:` – CI/CD changes  

Example:
```
feat: add toast notification system
fix: correct caching issue in storage service
```

---

## 💡 Tips for Contributors
- Keep PRs **small, focused, and atomic**.  
- Discuss larger changes with the team on [Discord](https://discord.gg/meshtastic) before starting work.  
- If unsure, open a draft PR for early feedback.  

---

## 🙌 Community
Contributors are the heart of Meshtastic ❤️.  
Join the conversation:  
- [Discord](https://discord.gg/meshtastic)  
- [GitHub Discussions](https://github.com/meshtastic/web/discussions)  

---

## 📜 License
By contributing, you agree that your contributions will be licensed under the [GPL-3.0-only License](./LICENSE).  
