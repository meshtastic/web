export interface SecurityState {
  privateKey: string;
  privateKeyVisible: boolean;
  adminKeyVisible: boolean;
  adminKey2Visible: boolean;
  adminKey3Visible: boolean;
  privateKeyBitCount: number;
  publicKey: string;
  adminKey1: string;
  adminKey2: string;
  adminKey3: string;
  privateKeyDialogOpen: boolean;
}

export type SecurityAction =
  | { type: "SET_PRIVATE_KEY"; payload: string }
  | { type: "TOGGLE_PRIVATE_KEY_VISIBILITY" }
  | { type: "TOGGLE_ADMIN_KEY_VISIBILITY" }
  | { type: "SET_PRIVATE_KEY_BIT_COUNT"; payload: number }
  | { type: "SET_PUBLIC_KEY"; payload: string }
  | { type: "SET_ADMIN1_KEY"; payload: string }
  | { type: "SET_ADMIN2_KEY"; payload: string }
  | { type: "SET_ADMIN3_KEY"; payload: string }
  | { type: "SHOW_PRIVATE_KEY_DIALOG"; payload: boolean }
  | {
    type: "REGENERATE_PRIV_PUB_KEY";
    payload: { privateKey: string; publicKey: string };
  };
