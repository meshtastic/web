/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly env: {
    readonly VITE_COMMIT_HASH: string;
  };
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
