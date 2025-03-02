export interface SecurityState {
  privateKey: string;
  privateKeyVisible: boolean;
  adminKeyVisible: boolean;
  privateKeyBitCount: number;
  adminKeyBitCount: number;
  publicKey: string;
  adminKey: string;
  privateKeyDialogOpen: boolean;
}

export type SecurityAction =
  | { type: "SET_PRIVATE_KEY"; payload: string }
  | { type: "TOGGLE_PRIVATE_KEY_VISIBILITY" }
  | { type: "TOGGLE_ADMIN_KEY_VISIBILITY" }
  | { type: "SET_PRIVATE_KEY_BIT_COUNT"; payload: number }
  | { type: "SET_PUBLIC_KEY"; payload: string }
  | { type: "SET_ADMIN_KEY"; payload: string }
  | { type: "SHOW_PRIVATE_KEY_DIALOG"; payload: boolean }
  | {
    type: "REGENERATE_PRIV_PUB_KEY";
    payload: { privateKey: string; publicKey: string };
  }
  | { type: "REGENERATE_ADMIN_KEY"; payload: { adminKey: string } };
