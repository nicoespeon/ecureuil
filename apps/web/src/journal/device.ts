const SECRET_KEY = "ecureuil.lien";
const DEVICE_KEY = "ecureuil.device";

/**
 * The secret of the lien opened on this device. It arrives in the URL fragment (ADR 3), which
 * never reaches a server, then stays on the device and leaves the address bar.
 */
export function lienSecret() {
  const fromLien = location.hash.slice(1);
  if (fromLien === "") return readStored(SECRET_KEY);
  writeStored(SECRET_KEY, fromLien);
  history.replaceState(history.state, "", `${location.pathname}${location.search}`);
  return fromLien;
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
