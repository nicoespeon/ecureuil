import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Ambiances } from "./prototype/Ambiances";
import "./styles.css";

const root = document.getElementById("root");
if (!root) {
  throw new Error("Missing #root element");
}

// Throwaway branch: the preview shows the ambiance mock-ups only, never the production journal.
createRoot(root).render(
  <StrictMode>
    <Ambiances params={new URLSearchParams(location.search)} />
  </StrictMode>,
);
