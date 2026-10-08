import { createContext, useContext } from "react";

/**
 * `DynamicForm` auto-saves by listening for the native `change` events that
 * bubble out of its fields (`<form onChange={handleSubmit(onSubmit)}>`).
 *
 * That only works for real DOM form controls (`<input>`, `<select>`, ...).
 * Custom controls such as the Radix `Switch` rendered by `ToggleInput` are
 * `<button role="switch">` elements: they never emit a `change` event
 * themselves and only reach the form through an undocumented implementation
 * detail (a visually hidden mirror `<input type="checkbox">` that Radix clicks
 * programmatically). Relying on that is fragile — if it ever stops bubbling,
 * every toggle in the app silently stops saving.
 *
 * `DynamicForm` therefore publishes its auto-save trigger here so those
 * controls can run it explicitly. It is `null` when the form is in
 * `submitType="onSubmit"` mode (an explicit submit button drives the save) or
 * when a field is rendered outside of a `DynamicForm`.
 */
export const FormAutoSaveContext = createContext<(() => void) | null>(null);

export function useFormAutoSave(): (() => void) | null {
  return useContext(FormAutoSaveContext);
}
