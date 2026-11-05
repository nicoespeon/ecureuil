import { seed } from "@ecureuil/domain";
import type { Actor } from "@ecureuil/wire";
import { render } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { App } from "../App";
import { accesStore } from "../acces/acces";
import { inMemoryJournal, type Journal } from "../journal/journal";

/** The app on the dev seed, as the configuration tests drive it: a device without a lien. */
export function renderApp({
  role = "proprietaire",
  journal = inMemoryJournal(seed),
}: {
  role?: Actor;
  journal?: Journal;
} = {}) {
  const user = userEvent.setup();
  const acces = accesStore({ apiUrl: undefined, secret: null, reload: () => {} });
  render(<App journal={journal} role={role} acces={acces} />);
  return { user, journal };
}
