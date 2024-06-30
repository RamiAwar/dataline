interface ImportMetaEnv {
  readonly VITE_BASE_PREFIX?: string;
  readonly VITE_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
