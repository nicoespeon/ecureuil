/// <reference types="vite/client" />

/** Declaration merging with Vite's own `ImportMetaEnv` needs an interface. */
interface ImportMetaEnv {
  /** The API's origin, e.g. `http://localhost:8787`; unset, the device never syncs. */
  readonly VITE_API_URL?: string;
}
