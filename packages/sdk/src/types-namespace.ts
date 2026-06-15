/**
 * Wrapper that surfaces the cross-cutting types under a single namespace
 * via `import * as Types`. Required because tsdown's dts emitter mishandles
 * `export * as Types from ...` directly (it emits a reference to a synthetic
 * `types_d_exports` identifier that's never declared, breaking downstream
 * consumers' dts bundlers).
 */
export * from "./core/types.ts";
