import { seed } from "@ecureuil/domain";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
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

const initial = import.meta.env.DEV ? seed : [];
const journal = await openLocalJournal("ecureuil", { seed: initial }).then(
  syncedWithApi,
  (error: unknown) => {
    console.error("IndexedDB unavailable: this page keeps its gestures in memory only", error);
    return inMemoryJournal(initial);
  },
);

createRoot(root).render(
  <StrictMode>
    <App journal={journal} />
  </StrictMode>,
);

/**
 * Without an API or a lien, the device works alone. With both, every gesture is pushed as
 * soon as it is written, and the loop pulls what the other devices wrote.
 */
function syncedWithApi({ journal, store }: Awaited<ReturnType<typeof openLocalJournal>>): Journal {
  const apiUrl = import.meta.env.VITE_API_URL;
  const secret = lienSecret();
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
