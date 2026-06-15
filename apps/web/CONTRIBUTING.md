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
- [Node.js](https://nodejs.org/) (v22 or later)  
- [pnpm](https://pnpm.io/) (v10.14.x or later)  
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
pnpm --filter @meshtastic/web dev
```

Once running, the site will be available at:  
👉 **http://localhost:3000**

---

## 🗂 Repository Structure
Meshtastic Web uses a **monorepo** setup managed with **pnpm workspaces**:

```
/packages
  ├─ web          # React frontend
  ├─ core         # Shared types & logic
  ├─ transport-*  # Transport layer packages
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

3. **Commit your changes** with a descriptive commit message that follows the [Conventional Commits](https://www.conventionalcommits.org/) style.  

4. **Open a Pull Request (PR)** from your fork's branch to the main repository's `main` branch on GitHub:
   - Clearly describe the problem and solution.  
   - Reference related issues (e.g., `Fixes #123`).  
   - Keep PRs focused on a single feature or fix.  
   - Complete all fields in the PR template.
   - Tag a **Meshtastic Web developer** in the PR for review.  

5. **CI/CD**:
   - Our GitHub Actions workflows handle builds, linting, and packaging automatically.  
   - All checks must pass before merge.  

---

## 🌍 Internationalization (i18n)

Meshtastic Web supports multiple languages. If your changes introduce **new user-facing strings**:

- Add them to the **`en.json`** file.  
- Do **not** hardcode English strings directly in components.  
- This ensures they can be translated into other languages.  

🔗 See these guides for more details:  
- [i18n Developer Guide](https://github.com/meshtastic/web/blob/main/packages/web/CONTRIBUTING_I18N_DEVELOPER_GUIDE.md)  
- [Translation Contribution Guide](https://github.com/meshtastic/web/blob/main/packages/web/CONTRIBUTING_TRANSLATIONS.md)  

---

## 🧪 Testing
Tests are written with [Vitest](https://vitest.dev/).  

Run all tests locally with:  

```bash
pnpm --filter @meshtastic/web test 
```

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
By contributing, you agree that your contributions will be licensed under the [GPL-3.0-only License](../../LICENSE).  
