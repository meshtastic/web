export interface SecurityState {
  privateKey: string;
  privateKeyVisible: boolean;
  adminKeyVisible: [boolean, boolean, boolean];
  privateKeyBitCount: number;
  publicKey: string;
  adminKey: [string, string, string];
  privateKeyDialogOpen: boolean;
}

export type SecurityAction =
  | { type: "SET_PRIVATE_KEY"; payload: string }
  | { type: "TOGGLE_PRIVATE_KEY_VISIBILITY" }
  | { type: "SET_PRIVATE_KEY_BIT_COUNT"; payload: number }
  | { type: "SET_PUBLIC_KEY"; payload: string }
  | { type: "SET_ADMIN_KEY"; payload: [string, string, string] }
  | { type: "SHOW_PRIVATE_KEY_DIALOG"; payload: boolean }
  | {
    type: "REGENERATE_PRIV_PUB_KEY";
    payload: { privateKey: string; publicKey: string };
  };
