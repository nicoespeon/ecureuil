import { expect, it } from "vitest";
import { WIRE_VERSION } from "./index";

it("exposes the wire version", () => {
  expect(WIRE_VERSION).toBe(1);
});
