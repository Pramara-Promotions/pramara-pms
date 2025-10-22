/// <reference types="vite/client" />

// ✅ declare all allowed VITE_ variables here
interface ImportMetaEnv {
  readonly VITE_API_URL?: string; // your backend API base
  readonly VITE_APP_ENV?: string; // optional, staging/production flag
  // add more if you introduce others later
}

// ✅ makes import.meta.env strongly typed
interface ImportMeta {
  readonly env: ImportMetaEnv;
}
