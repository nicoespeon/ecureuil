import { useState } from "react";
import { readStored, writeStored } from "../journal/device";

/** At home the list is prepared, in the magasin the courses are done: two ways to show it. */
export type Mode = "preparer" | "courses";

const MODE_KEY = "ecureuil.mode";

/**
 * A device preference, not a fact of the foyer: it stays out of the journal. The app opens in
 * the last mode, so a reload in the magasin keeps the boxes.
 */
export function useMode() {
  const [mode, setMode] = useState<Mode>(() =>
    readStored(MODE_KEY) === "courses" ? "courses" : "preparer",
  );
  return {
    mode,
    setMode: (next: Mode) => {
      writeStored(MODE_KEY, next);
      setMode(next);
    },
  };
}
