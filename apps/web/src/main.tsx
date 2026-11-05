import { seed } from "@ecureuil/domain";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { inMemoryJournal } from "./journal/journal";
import "./styles.css";

const root = document.getElementById("root");
if (!root) {
  throw new Error("Missing #root element");
}

createRoot(root).render(
  <StrictMode>
    <App journal={inMemoryJournal(seed)} />
  </StrictMode>,
);
