import type { Actor } from "@ecureuil/wire";
import { Data } from "effect";
import { rememberLienSecret, rememberRole, storedRole } from "../journal/device";
import { fetchNewInviteSecret, fetchRole } from "./lienApi";

/** Where this device stands with the foyer: whether it may write, and as whom. */
export type Acces = Data.TaggedEnum<{
  /** No API or no lien: the device works alone, as the proprietaire. */
  SansLien: Record<never, never>;
  /** A lien whose role is not known yet: nothing can be written until it is. */
  Verification: Record<never, never>;
  HorsLigne: Record<never, never>;
  Connecte: { readonly role: Actor };
  /** The API refuses the secret: the lien was replaced. */
  Invalide: Record<never, never>;
}>;

const Acces = Data.taggedEnum<Acces>();

export type AccesStore = ReturnType<typeof accesStore>;

/**
 * The access of this device as React reads it. The role is checked with the API at every
 * launch; the one already learnt opens the app offline meanwhile.
 */
export function accesStore({
  apiUrl,
  secret,
  reload,
}: {
  apiUrl: string | undefined;
  secret: string | null;
  /** Restarts the app, so a new lien also restarts the sync with its secret. */
  reload: () => void;
}) {
  const connexion = apiUrl && secret !== null ? { apiUrl, secret } : undefined;
  let state: Acces = initialAcces(connexion !== undefined);
  const listeners = new Set<() => void>();
  const set = (next: Acces) => {
    state = next;
    for (const listener of listeners) listener();
  };

  const verify = async () => {
    if (connexion === undefined) return;
    const known = state._tag === "Connecte";
    if (!known) set(Acces.Verification());
    const checked = await checkedAcces(connexion);
    // Offline, a role already learnt keeps the app open.
    if (!(known && checked._tag === "HorsLigne")) set(checked);
  };
  void verify();

  return {
    get: () => state,
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    verify,
    openLien: (pasted: string) => {
      rememberLienSecret(secretOfLien(pasted));
      reload();
    },
    /** The full lien to hand to the invite, built on this app's own address. */
    newInviteLien: async () => {
      if (connexion === undefined) throw new Error("No lien on this device");
      return `${location.origin}/#${await fetchNewInviteSecret(connexion)}`;
    },
  };
}

async function checkedAcces(connexion: { apiUrl: string; secret: string }) {
  try {
    const role = await fetchRole(connexion);
    if (role === undefined) return Acces.Invalide();
    rememberRole(role);
    return Acces.Connecte({ role });
  } catch {
    return Acces.HorsLigne();
  }
}

function initialAcces(hasLien: boolean) {
  if (!hasLien) return Acces.SansLien();
  const role = storedRole();
  return role === null ? Acces.Verification() : Acces.Connecte({ role });
}

/** The whole lien as copied, or its secret alone. */
function secretOfLien(pasted: string) {
  const trimmed = pasted.trim();
  return trimmed.slice(trimmed.lastIndexOf("#") + 1);
}
