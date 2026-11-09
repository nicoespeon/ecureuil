import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

afterEach(() => {
  cleanup();
  // What a test appends to the body itself, like a ball still in flight, is not cleanup's.
  document.body.replaceChildren();
  vi.unstubAllGlobals();
  localStorage.clear();
  vi.useRealTimers();
});
