# Meshtastic Web Client - React & TypeScript Coding Guidelines

_This document outlines the primary coding guidelines and contribution standards
for the Meshtastic Web Client project. It details our preferred styles,
patterns, and practices to ensure code consistency and quality. As our project
evolves, these guidelines should be treated as a living document, updated
regularly with new suggestions and improvements from the team._

## Table of Contents

- [General Principles](#general-principles)
- [File Structure](#file-structure)
- [Component Design](#component-design)
- [TypeScript Usage](#typescript-usage)
- [Styling (Tailwind CSS)](#styling-tailwind-css)
- [State Management](#state-management)
- [Hooks](#hooks)
- [Testing](#testing)
- [Naming Conventions](#naming-conventions)
- [Code Formatting & Linting](#code-formatting--linting)
- [Dependency Management & Library Usage](#dependency-management--library-usage)
- [Documentation](#documentation)
- [Git & PRs](#git--prs)

## General Principles

- **Readability:** Write code that is easy for others (and your future self) to
  understand.
- **Consistency:** Adhere to these guidelines to maintain a consistent codebase.
- **Simplicity (KISS):** Keep components and functions focused and avoid
  unnecessary complexity.
- **Dry (Don't Repeat Yourself):** Abstract reusable logic and components.
- **Accessibility (a11y):** Build interfaces that are usable by everyone. Use
  semantic HTML and ARIA attributes where appropriate.

## File Structure

Our project uses the following directory structure within `/src`:

- **/src**: The root directory for all source code.

- **/src/core**: Contains foundational code shared across the entire
  application.
  - **/src/core/dto**: Defines Data Transfer Objects, typically plain objects
    mirroring API structures or used for passing structured data internally.
  - **/src/core/hooks**: Houses custom hooks with **high reusability** across
    multiple features or domains (e.g., `useCopyToClipboard`,
    `useLocalStorage`). Hooks specific to a single component or feature should
    be co-located.
  - **/src/core/stores**: Contains global state management stores, implemented
    using **Zustand**.
  - **/src/core/utils**: Holds general-purpose utility functions with **high
    reusability** across the application (e.g., date formatters, string
    formatters, date/time convertion helpers). Utilities specific to a component
    or feature should be co-located or placed within that feature's scope.

- **/src/components**: Acts as a general container for components.
  - **/src/components/UI**: Houses generic, highly reusable UI elements (e.g.,
    `Button`, `Input`, `Dialog`). These should be application-agnostic and
    stylable.
  - **/src/components/PageComponents**: Contains components that encapsulate
    specific features or logic primarily used within one or more pages from
    `/src/pages`. This is where the bulk of the logic delegated from
    `/src/pages` components should reside (e.g., `NodeDetails`, `MessageItem`).

- **/src/pages**:
  - Contains view-specific components, representing distinct pages or routes
    (e.g., `Channels.tsx`, `Messages.tsx`).
  - These components should contain **minimal logic**, focusing on composing
    layout and integrating components from `/src/components/PageComponents`.

- **/src/validation**:
  - Stores validation schemas (e.g., using Zod) primarily intended for
    validating user data prior to it being saved to the Meshtatic within the
    `onSubmit` function.

- **/src/tests**:
  - Contains global test configuration (e.g., Vitest config, global setup files,
    potentially shared mocks or test utilities).
  - **Note:** Individual test files (e.g., `Button.test.tsx`) must **still be
    co-located** with the source code file they are testing. This directory is
    _not_ intended to hold all test files.

**Co-location within Directories:**

- The co-location strategy remains essential _within_ `/pages`,
  `/components/UI`, and `/components/PageComponents`.
- **Refactoring Pattern:** If a component file (e.g., `NodeList.tsx`) grows
  complex or requires related files (hooks, tests, sub-components), replace it
  with a directory `NodeList/`. Move the component code to `NodeList/index.tsx`
  (preserving import paths). Co-locate related files (tests,
  _component-specific_ hooks/utils, sub-components) within this directory.

**Module Barrel Files (`mod.ts`):**

- Use `mod.ts` if needed to create barrel files for exporting multiple items
  from utility directories (e.g., `/src/core/utils/mod.ts`) or specific feature
  groupings if they arise.
- Remember the component co-location pattern uses `index.tsx` specifically to
  maintain clean import paths for the component itself.

## Component Design

- **Functional Components:** Use functional components with Hooks exclusively.
- **Props:**
  - Define props using TypeScript interfaces
    (`interface Component Name + Props {}` ex: DialogProps {}).
  - Be explicit with prop types. Use `| undefined` for optional props if
    necessary, but prefer explicit boolean props (e.g., `isEnabled` vs.
    `disabled={true/false}`).
  - Destructure props within the function signature.
  - Avoid overly complex prop objects; pass data down as needed.
- **Component Size:** Keep components small and focused on a single
  responsibility. If a component becomes too large or complex, break it down.
- **Composition:** Favor composition over inheritance. Build complex UIs by
  combining smaller, reusable components.
- **JSX:**
  - Always provide `key` props when rendering lists. The `key` prop should be
    used on a unique id value and never on the array index value.
  - Use fragments (`<>...</>`) when you don't need a wrapping DOM element.
  - Conditional rendering: Use clear and concise methods (e.g. ternary
    operators, or dedicated variables/functions for complex logic).

## TypeScript Usage

- **Strict Mode:** Enable `strict` mode in `deno.json`
- **Explicit Types:** Be explicit with types for function parameters, return
  values, and complex variables. Let TypeScript infer simple types where
  obvious.
- **Interfaces vs. Types:**
  - Use `interface` for defining the shape of objects and component props.
  - Use `type` for unions, intersections, primitives, tuples, or more complex
    type manipulations.
- **`any`:** Avoid using `any`. Use `unknown` if the type is truly unknown and
  perform type checking, or define a more specific type. Use
  `// deno-lint-ignore no-explicit-any` with a justification comment in rare,
  unavoidable cases.
- **Enums:** Prefer string literal unions
  (`type Status = 'idle' | 'loading' | 'success' | 'error';`) over numeric or
  string enums for better readability and bundle size, unless the enum provides
  specific advantages for your use case.
- **Utility Types:** Leverage built-in utility types like `Partial`, `Required`,
  `Readonly`, `Pick`, `Omit` to create new types from existing ones.
- **Generics:** Use generics for reusable functions, hooks, and components that
  operate on different data types while maintaining type safety.

## Styling (Tailwind CSS)

- **Utility-First:** Embrace the utility-first nature of Tailwind. Apply styles
  directly in the JSX.
- **Readability:** If a component has a large number of Tailwind classes,
  consider:
  - Breaking the component down into smaller ones.
  - Using a utility like `clsx` or `classnames` for conditional classes.
  - Extracting repetitive class combinations into variables within the component
    or potentially using `@apply` in a CSS file _sparingly_ for complex, highly
    reused patterns (though generally prefer composition or utility functions).
- **`@apply`:** Use `@apply` with caution. It can negate some of Tailwind's
  benefits if overused. Prefer composing utilities directly in JSX or creating
  reusable components. Use it mainly for complex, non-reusable local
  abstractions if needed.
- **Customization:** Define custom colors, spacing, fonts, etc., in `index.css`
  rather than using arbitrary values (`![...]`) frequently.

## State Management

- **Local State (`useState`):** Use for component-specific state that doesn't
  need to be shared.
- **Derived State:** Calculate values directly from props or existing state
  during rendering instead of storing derived state in `useState` unless the
  calculation is expensive (then use `useMemo`).
- **Reducer (`useReducer`):** Use for complex state logic involving multiple
  sub-values or when the next state depends on the previous one, especially
  within a single component or closely related components (can be co-located).
- **Global State (Zustand):** Use Zustand for managing application-wide state.
  Store definitions reside in `/src/core/stores`.

## Hooks

- **Naming:** Prefix custom hooks with `use` (e.g., `useNodeList`,
  `useDebounce`).
- **Single Responsibility:** Hooks should have a clear, single purpose.
- **Reusability:** Design hooks intended for broad reuse and place them in
  `/src/core/hooks`. Hooks specific to a component/feature should be co-located
  next to that component.
- **Composability:** Favor creating smaller, general-purpose hooks. These can
  often be composed together (used within other custom hooks) to build more
  complex logic cleanly and maintainably.
- **Rules of Hooks:** Adhere strictly to the Rules of Hooks (only call Hooks at
  the top level, only call Hooks from React functions). Deno Lint can help
  enforce these.
- **Minimize `useEffect` Usage:** Avoid using `useEffect` for logic that can be
  handled during rendering (data transformation) or in event handlers (user
  interactions). Effects are primarily for synchronizing with external systems
  (network requests, timers, browser APIs). Before using an Effect, consult the
  React documentation to see if it's truly necessary. Refer to:
  [You Might Not Need an Effect](https://react.dev/learn/you-might-not-need-an-effect).
- **Dependency Arrays:** When `useEffect`, `useCallback`, or `useMemo` are
  necessary, be diligent with their dependency arrays. Include all values from
  the function scope that the hook depends on. Deno Lint includes rules (like
  `react-hooks-exhaustive-deps` if enabled in config) to help enforce this,
  ensuring stability and preventing stale closures.

## Testing

- **Test Framework (Vitest):** Use Vitest for all levels of automated testing,
  including unit, integration, and component tests. Global test
  configuration/setup files reside in `/src/tests`.
- **Component Testing (React Testing Library):** Utilize React Testing Library
  (with Vitest) for component testing, focusing on testing behavior from the
  user's perspective rather than implementation details.
- **Unit Tests:** Use Vitest for testing utility functions, hooks, and complex
  logic isolated from the UI.
- **Integration Tests:** Use Vitest and React Testing Library to test
  interactions between multiple components.
- **End-to-End Tests (Playwright/Cypress):** Use for testing critical user flows
  through the entire application. (Choose one framework if applicable).
- **Test Requirement:** All new features or significant code changes **must**
  include corresponding tests. Tests should be added, updated, or refactored
  alongside the code they are testing.
- **Co-location:** Individual test files (`*.test.tsx`, `*.test.ts`) **must** be
  co-located with the source code file they are testing.
- **Coverage:** Aim for reasonable test coverage, focusing on critical paths,
  complex logic, and potential edge cases. Don't chase 100% coverage blindly,
  prioritize meaningful tests.
- **Mocking:** Use Vitest's built-in mocking capabilities for dependencies
  (modules, timers).

## Naming Conventions

- **Components:** `PascalCase` (e.g., `ChannelChat`, `NodeDetail`). If you are
  co-locating other files together create a folder and keep the primary
  component named `Component/index.tsx`.
- **Hooks:** `useCamelCase` (e.g., `useNodes`).
- **Variables/Functions:** `camelCase` (e.g., `nodeCount`).
- **Constants:** `UPPER_SNAKE_CASE` (e.g., `MAX_ROWS`, `DEFAULT_ZOOM_LEVEL`).
- **TypeScript Types/Interfaces:** `PascalCase` (e.g., `NodeData`, `MapProps`).
- **Boolean Props/Variables:** Use positive phrasing (e.g., `isEnabled`,
  `isActive`) rather than negative (`isDisabled`, `isInactive`).

## Code Formatting & Linting

- **Formatter (Deno Formatter):** Use Deno's built-in formatter
  (`deno task format`) for consistent code formatting. It is recommended to use
  the default Deno formatting rules.
- **Linter (Deno Linter):** Use Deno's built-in linter (`deno task lint`) for
  identifying code quality issues and potential errors. Adhere to the default
  Deno linting rules.
- **Configuration:** While `deno task format` and `deno task lint` work with
  defaults, specific configurations (like includes/excludes or rule adjustments)
  can be managed in the `deno.json` file if necessary. Commit this configuration
  file to the repository if used.
- **Integration:** Integrate `deno task format` and `deno task lint` into your
  development workflow:
  - Configure your editor to use Deno's tools for formatting on save and
    displaying lint errors.

## Dependency Management & Library Usage

**Core Principle: Minimize Bundle Size**

A primary goal of this project is to maintain a small and performant application
bundle. Every external dependency added increases the potential size and
complexity. Therefore, we prioritize minimizing the number of third-party
libraries.

**Guidelines:**

1. **Vanilla First:** Before reaching for an external library, strongly consider
   if the required functionality can be reasonably achieved using internal or
   runtime-provided resources first:
   - Standard browser APIs (Web APIs).
   - Vanilla TypeScript features and logic.
   - **The Deno Standard Library (`@std`):** Check if a suitable, audited module
     exists within the Deno Standard Library
     ([https://jsr.io/@std](https://jsr.io/@std)). Utilizing `@std` was a
     driving factor in choosing Deno, so leverage it where appropriate before
     adding external dependencies.

2. **Primary Evaluation Criteria:** When considering adding or retaining an
   _external_ library (beyond `@std`), the following are **primary decision
   factors**:
   - **Bundle Size Impact:** Analyze the library's size (e.g., using
     `bundlephobia.com`). How significantly does it increase the overall bundle?
     Does it support tree-shaking effectively? Smaller is strongly preferred.
   - **Maintenance & Activity:** Is the library **actively maintained with
     recent updates**? Check its repository (e.g., GitHub) for recent commits,
     releases, and responsiveness to issues. Avoid libraries that appear
     abandoned or unmaintained.
   - **Adoption & Popularity:** Is the library widely used and established
     within the community (e.g., high download counts on npm/JSR, significant
     GitHub stars)? A larger user base often indicates better vetting, more
     available support, and higher likelihood of long-term maintenance.
   - **Necessity:** Does it solve a genuinely complex problem that would be
     significantly time-consuming or error-prone to build ourselves (or isn't
     covered by the Deno Standard Library `jsr:@std`)?
   - **Quality & Documentation:** Is the library well-documented? Does it follow
     good coding practices?
   - **Ecosystem Fit:** Does it align well with our existing core technologies
     (React, TypeScript, Vite)?

3. **Strategic Adoption/Migration:** Adding or switching libraries is
   justifiable when a candidate excels in the primary criteria (size,
   maintenance, adoption) _and_ offers significant improvements (developer
   experience, performance, capabilities) or strong ecosystem benefits over
   alternatives or existing solutions.

4. **Team Approval:** Adding significant new _external_ dependencies should
   ideally be discussed briefly with the team or project maintainers to ensure
   alignment with project goals.

**In short: Prioritize Browser APIs, Vanilla TS, and the Deno Standard Library.
For external libraries, prioritize small, well-maintained, and widely adopted
ones. Be deliberate when adding external dependencies, and focus on quality and
ecosystem fit when one _is_ necessary.**

## Documentation

- **Complex Logic:** Add comments to explain complex algorithms, non-obvious
  logic, or workarounds. Avoid commenting on obvious code.
- **README:** Maintain a comprehensive `README.md` covering project setup,
  architecture overview, and contribution guidelines (or link to this file
  `CONTRIBUTING.md`).

## Git & PRs

- **Branching:** Use a feature-branching workflow (e.g., Gitflow simplified).
  Create branches from `master` for new features or fixes.
- **Commit Messages:** Follow Conventional Commits format (e.g.,
  `feat: add node filtering`, `fix: resolve map marker overlap`,
  `refactor: simplify state logic`).
- **Pull Requests (PRs):**
  - Keep PRs small and focused on a single issue or feature.
  - Write clear PR descriptions explaining the _what_ and _why_ of the change.
    Include steps for testing or screenshots if applicable.
  - Ensure code is linted and formatted before pushing.
  - Ensure tests pass.
  - Require code reviews before merging.
