import { expect, it } from "vitest";
import { initialState, replay } from "./reducer";

it("replays an empty journal into the initial state", () => {
  expect(replay([])).toEqual(initialState);
});
