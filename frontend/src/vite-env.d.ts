/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** API address; "/api" in the container build, unset in local dev */
  readonly VITE_API_BASE?: string
}
