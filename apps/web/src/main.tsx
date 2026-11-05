import { seed } from "@ecureuil/domain";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { AccesGate } from "./acces/AccesGate";
import { accesStore } from "./acces/acces";
import { lienSecret } from "./journal/device";
import { httpTransport } from "./journal/httpTransport";
import { inMemoryJournal, type Journal } from "./journal/journal";
import { openLocalJournal } from "./journal/localJournal";
import { startSync } from "./journal/startSync";
import "./styles.css";

const root = document.getElementById("root");
if (!root) {
  throw new Error("Missing #root element");
}

const apiUrl = import.meta.env.VITE_API_URL;
const secret = lienSecret();
const acces = accesStore({ apiUrl, secret, reload: () => location.reload() });

const initial = import.meta.env.DEV ? seed : [];
const journal = await openLocalJournal("ecureuil", { seed: initial }).then(
  (opened) => syncedWithApi(opened, { apiUrl, secret }),
  (error: unknown) => {
    console.error("IndexedDB unavailable: this page keeps its gestures in memory only", error);
    return inMemoryJournal(initial);
  },
);

createRoot(root).render(
  <StrictMode>
    <AccesGate acces={acces}>
      {(role) => <App journal={journal} role={role} acces={acces} />}
    </AccesGate>
  </StrictMode>,
);

/**
 * Without an API or a lien, the device works alone. With both, every gesture is pushed as
 * soon as it is written, and the loop pulls what the other devices wrote.
 */
function syncedWithApi(
  { journal, store }: Awaited<ReturnType<typeof openLocalJournal>>,
  { apiUrl, secret }: { apiUrl: string | undefined; secret: string | null },
): Journal {
  if (!apiUrl || secret === null) return journal;

  const { requestSync } = startSync({ store, transport: httpTransport({ apiUrl, secret }) });
  return {
    ...journal,
    append: async (event) => {
      await journal.append(event);
      requestSync();
    },
  };
}
