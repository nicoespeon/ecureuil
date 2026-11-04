import type { Event } from "./event";

export type State = Readonly<Record<never, never>>;

export const initialState: State = {};

export function replay(events: ReadonlyArray<Event>) {
  return events.reduce(reduce, initialState);
}

function reduce(state: State, _event: Event): State {
  return state;
}
