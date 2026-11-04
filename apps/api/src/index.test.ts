import { expect, it } from "vitest";
import { app } from "./index";

it("answers /health", async () => {
  const response = await app.request("/health");

  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ ok: true });
});
