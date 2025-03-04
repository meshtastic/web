import type { SecurityAction, SecurityState } from "./types.ts";

export function securityReducer(
  state: SecurityState,
  action: SecurityAction,
): SecurityState {
  switch (action.type) {
    case "SET_PRIVATE_KEY":
      return { ...state, privateKey: action.payload };
    case "TOGGLE_PRIVATE_KEY_VISIBILITY":
      return { ...state, privateKeyVisible: !state.privateKeyVisible };
    case "TOGGLE_ADMIN_KEY_VISIBILITY":
      return { ...state, adminKeyVisible: !state.adminKeyVisible };
    case "SET_PRIVATE_KEY_BIT_COUNT":
      return { ...state, privateKeyBitCount: action.payload };
    case "SET_PUBLIC_KEY":
      return { ...state, publicKey: action.payload };
    case "SET_ADMIN_KEY":
      return { ...state, adminKey: action.payload };
    case "SHOW_PRIVATE_KEY_DIALOG":
      return { ...state, privateKeyDialogOpen: action.payload };
    case "REGENERATE_PRIV_PUB_KEY":
      return {
        ...state,
        privateKey: action.payload.privateKey,
        publicKey: action.payload.publicKey,
        privateKeyDialogOpen: false,
      };
    case "REGENERATE_ADMIN_KEY":
      return {
        ...state,
        adminKey: action.payload.adminKey,
      };
    default:
      return state;
  }
}
