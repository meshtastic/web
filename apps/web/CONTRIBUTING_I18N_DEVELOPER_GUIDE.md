# i18n Developer Guide

When developing new components, all user-facing text must be added as an i18n
key and rendered using our translation functions. This ensures your UI can be
translated into multiple languages.

## Adding New i18n Keys

### Search Before Creating

Before adding a new key, please perform a quick search to see if one that fits
your needs already exists. Many common labels like "Save," "Cancel," "Name,"
"Description," "Loading...," or "Error" are likely already present, especially
in the common.json namespace. Reusing existing keys prevents duplication and
ensures consistency across the application. Using your code editor's search
function across the /i18n/locales/en/ directory is an effective way to do this.

### Key Naming and Structure Rules

To maintain consistency and ease of use, please adhere to the following rules
when creating new keys in the JSON files.

- **Keys are camelCase:** `exampleKey`, `anotherExampleKey`.
- **Avoid Deep Nesting:** One or two levels of nesting are acceptable for
  grouping related keys (e.g., all labels for a specific menu). However, nesting
  deeper than two levels should be avoided to maintain readability and ease of
  use.
  - **Good (1 level):**
    ```json
    "buttons": {
      "save": "Save",
      "cancel": "Cancel"
    }
    ```
  - **Acceptable (2 levels):**
    ```json
    "userMenu": {
      "items": {
        "profile": "Profile",
        "settings": "Settings"
      }
    }
    ```
  - **Avoid (3+ levels):**
    ```json
    "userMenu": {
      "items": {
        "actions": {
          "viewProfile": "View Profile"
        }
      }
    }
    ```
- **Organize for Retrieval, Not UI Layout:** Keys should be named logically for
  easy retrieval, not to mirror the layout of your component.

### Namespace Rules

We use namespaces to organize keys. All source keys are added to the English
(`en`) files located at `/packages/web/public/i18n/locales/en/`. Place your new keys in the
appropriate file based on these rules:

- `common.json`:
  - All button labels (`save`, `cancel`, `submit`, etc.).
  - Any text that is repeated and used throughout the application (e.g.,
    "Loading...", "Error").
- `ui.json`:
  - Labels and text specific to a distinct UI element or view that isn't a
    dialog or a config page.
- `dialog.json`:
  - All text specific to modal dialogs (titles, body text, prompts).
- `messages.json`:
  - Text specifically related to the messaging interface.
- `deviceConfig.json` & `moduleConfig.json`:
  - Labels and descriptions for the settings on the Device and Module
    configuration pages.

## Using i18n Keys in Components

We use the `useTranslation` hook from `react-i18next` to access the translation
function, `t`.

### Default Namespaces

Our i18next configuration has fallback namespaces configured which includes
`common`, `ui`, and `dialog`. This means you **do not** need to explicitly
specify these namespaces when calling the hook. The system will automatically
check these files for your key.

For any keys in `common.json`, `ui.json`, or `dialog.json`, you can instantiate
the hook simply:

```typescript
import { useTranslation } from "react-i18next";

// In your component
const { t } = useTranslation(["messages"]);

// Usage
return <p>{t("someMessageLabel")}</p>;
```

You can also specify the namespace on a per-call basis using the options object.
This is useful if a component primarily uses a default namespace but needs a
single key from another.

```typescript
const { t } = useTranslation();

return <p>{t("someMessageLabel", { ns: "messages" })}</p>;
```
