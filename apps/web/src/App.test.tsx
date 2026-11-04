import { renderToString } from "react-dom/server";
import { expect, it } from "vitest";
import { App } from "./App";

it("renders the app name", () => {
  expect(renderToString(<App />)).toContain("Écureuil");
});
