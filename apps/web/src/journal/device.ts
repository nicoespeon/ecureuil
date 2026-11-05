import { Actor } from "@ecureuil/wire";
import { Schema } from "effect";

const SECRET_KEY = "ecureuil.lien";
const ROLE_KEY = "ecureuil.role";
const DEVICE_KEY = "ecureuil.device";
const DEVICE_NAME_KEY = "ecureuil.deviceName";

/**
 * The secret of the lien opened on this device. It arrives in the URL fragment (ADR 3), which
 * never reaches a server, then stays on the device and leaves the address bar.
 */
export function lienSecret() {
  const fromLien = location.hash.slice(1);
  if (fromLien === "") return readStored(SECRET_KEY);
  rememberLienSecret(fromLien);
  history.replaceState(history.state, "", `${location.pathname}${location.search}`);
  return fromLien;
}

/** The role learnt for the previous secret is not this one's: it is learnt again. */
export function rememberLienSecret(secret: string) {
  if (readStored(SECRET_KEY) === secret) return;
  writeStored(SECRET_KEY, secret);
  removeStored(ROLE_KEY);
}

const isActor = Schema.is(Actor);

/** The role the API gave for the stored secret, so the next launch knows it offline. */
export function storedRole() {
  const stored = readStored(ROLE_KEY);
  return isActor(stored) ? stored : null;
}

export function rememberRole(role: Actor) {
  writeStored(ROLE_KEY, role);
}

/** A name for the people of the foyer ("Téléphone de Nicolas"); it stays on this device. */
export function deviceName() {
  return readStored(DEVICE_NAME_KEY);
}

export function rememberDeviceName(name: string) {
  writeStored(DEVICE_NAME_KEY, name);
}

/** An opaque id generated the first time this device opens the app (ADR 4). */
export function thisDevice() {
  const stored = readStored(DEVICE_KEY);
  if (stored !== null) return stored;
  const generated = crypto.randomUUID();
  writeStored(DEVICE_KEY, generated);
  return generated;
}

/** Storage can be blocked by the browser: nothing is remembered past this page load. */
function readStored(key: string) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStored(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Not remembered on this device.
  }
}

function removeStored(key: string) {
  try {
    localStorage.removeItem(key);
  } catch {
    // Nothing was remembered either.
  }
}
