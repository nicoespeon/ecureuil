import { seed, seedSorties } from "@ecureuil/domain";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { accesStore } from "./acces/acces";
import { inMemoryJournal } from "./journal/journal";
import "./styles.css";

const root = document.getElementById("root");
if (!root) {
  throw new Error("Missing #root element");
}

// PROTOTYPE: the seed in memory, never synced, so the preview never writes to the real journal.
const acces = accesStore({ apiUrl: undefined, secret: null, reload: () => location.reload() });
const journal = inMemoryJournal([...seed, ...seedSorties]);

createRoot(root).render(
  <StrictMode>
    <App journal={journal} role="proprietaire" acces={acces} />
  </StrictMode>,
);
