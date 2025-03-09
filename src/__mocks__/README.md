# Mocks Directory

This directory contains mock implementations used by Vitest for testing.

## Structure

The directory structure mirrors the actual project structure to make mocking
more intuitive:

```
__mocks__/
├── components/
│   └── UI/
│       ├── Dialog.tsx
│       ├── Button.tsx
│       ├── Checkbox.tsx
│       └── ...
├── core/
│   └── ...
└── ...
```

## Auto-mocking

Vitest will automatically use the mock files in this directory when the
corresponding module is imported in tests. For example, when a test imports
`@components/UI/Dialog.tsx`, Vitest will use
`__mocks__/components/UI/Dialog.tsx` instead.

## Creating New Mocks

To create a new mock:

1. Create a file in the same relative path as the original module
2. Export the mocked functionality with the same names as the original
3. Add a `vi.mock()` statement to `vitest.setup.ts` if needed

## Mock Guidelines

- Keep mocks as simple as possible
- Use `data-testid` attributes for easy querying in tests
- Implement just enough functionality to test the component
- Use TypeScript types to ensure compatibility with the original module
