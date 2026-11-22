/**
 * DOM checks for global single-key shortcuts: don't fire while the user
 * types or while a popup owns the keyboard.
 */

const POPUP_ROLES =
  '[role="dialog"], [role="alertdialog"], [role="menu"], [role="listbox"]';

/** Text fields, selects and contenteditable regions. */
export const isEditableTarget = (target: EventTarget | null): boolean =>
  target instanceof HTMLElement &&
  (target.isContentEditable ||
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement);

/** The key went to an element inside a menu, listbox or dialog. */
export const isInsidePopup = (target: EventTarget | null): boolean =>
  target instanceof Element && target.closest(POPUP_ROLES) !== null;

/** A dialog, menu or listbox is open anywhere on the page. */
export const isPopupOpen = (root: ParentNode): boolean =>
  root.querySelector(POPUP_ROLES) !== null;
