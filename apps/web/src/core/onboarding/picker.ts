/**
 * Browsers reject the Bluetooth and USB pickers with `NotFoundError` both
 * when the user closes the chooser and when the adapter or permission is
 * missing ("Bluetooth adapter not available."). Only the first is a cancel;
 * the rest are failures to show on the error screen.
 */
const CANCEL_MESSAGE = /cancel|no port selected|no device selected/i;

export type PickerFailure =
  | { readonly kind: "cancelled" }
  | { readonly kind: "failed"; readonly detail: string };

export function classifyPickerError(error: unknown): PickerFailure {
  if (error instanceof Error) {
    if (error.name === "NotFoundError" && CANCEL_MESSAGE.test(error.message)) {
      return { kind: "cancelled" };
    }
    return { kind: "failed", detail: error.message };
  }
  return { kind: "failed", detail: String(error) };
}

/** How long the wizard waits for a radio to answer before giving up. */
export const CONNECT_TIMEOUT_MS = 30_000;
