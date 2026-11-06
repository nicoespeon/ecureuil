import { useState } from "react";

/** At home the list is prepared, in the magasin the courses are done: two ways to show it. */
export type Mode = "preparer" | "courses";

const MODE_KEY = "ecureuil.mode";

/**
 * A device preference, not a fact of the foyer: it stays out of the journal. The app opens in
 * the last mode, so a reload in the magasin keeps the boxes.
 */
export function useMode() {
  const [mode, setMode] = useState(readMode);
  return {
    mode,
    setMode: (next: Mode) => {
      writeMode(next);
      setMode(next);
    },
  };
}

function readMode(): Mode {
  try {
    return localStorage.getItem(MODE_KEY) === "courses" ? "courses" : "preparer";
  } catch {
    return "preparer";
  }
}

function writeMode(mode: Mode) {
  try {
    localStorage.setItem(MODE_KEY, mode);
  } catch {
    // Not remembered on this device; the mode still holds until the page reloads.
  }
}
