import { seed, seedSorties } from "@ecureuil/domain";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { accesStore } from "./acces/acces";
import { inMemoryJournal } from "./journal/journal";
import { MessageHost } from "./prototype/message";
import { applyVariante, VariantesSwitcher } from "./prototype/Variantes";
import "./styles.css";

const root = document.getElementById("root");
if (!root) {
  throw new Error("Missing #root element");
}

// Throwaway branch: the seed in memory, never the production journal.
const params = new URLSearchParams(location.search);
applyVariante(params);
const acces = accesStore({ apiUrl: undefined, secret: null, reload: () => location.reload() });
const journal = inMemoryJournal([...seed, ...seedSorties]);

createRoot(root).render(
  <StrictMode>
    <App
      journal={journal}
      role={params.get("role") === "invite" ? "invite" : "proprietaire"}
      acces={acces}
    />
    <MessageHost />
    {!params.has("capture") && <VariantesSwitcher />}
  </StrictMode>,
);
