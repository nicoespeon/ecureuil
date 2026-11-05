import {
  authorizationHeader,
  inviteLienPath,
  LienResponse,
  lienPath,
  NewLienResponse,
} from "@ecureuil/wire";
import { Schema } from "effect";

type Connexion = { readonly apiUrl: string; readonly secret: string };

const decodeLien = Schema.decodeUnknownSync(LienResponse);
const decodeNewLien = Schema.decodeUnknownSync(NewLienResponse);

/**
 * The role of the lien, or `undefined` when the API does not know its secret (401).
 * Rejects when the API cannot be reached or answers out of contract.
 */
export async function fetchRole(connexion: Connexion) {
  const response = await call(connexion, lienPath, "GET");
  if (response.status === 401) return undefined;
  return decodeLien(await read(response)).role;
}

/** Replaces the invite's lien: its old secret stops working. Proprietaire only. */
export async function fetchNewInviteSecret(connexion: Connexion) {
  const response = await call(connexion, inviteLienPath, "POST");
  return decodeNewLien(await read(response)).secret;
}

function call({ apiUrl, secret }: Connexion, path: string, method: string) {
  return fetch(new URL(path, apiUrl).href, {
    method,
    headers: { [authorizationHeader]: `Bearer ${secret}` },
  });
}

async function read(response: Response) {
  if (!response.ok) throw new Error(`${response.status} ${await response.text()}`);
  return response.json();
}
