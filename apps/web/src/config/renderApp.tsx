import { seed } from "@ecureuil/domain";
import type { Actor } from "@ecureuil/wire";
import { render, screen, within } from "@testing-library/react";
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

/** What every live region says right now: the message and the screen's own announcements. */
export function statusTexts() {
  return screen.getAllByRole("status").map((status) => status.textContent);
}

/** The message a gesture shows, the one a tap closes: none, or the latest. */
export function shownMessages() {
  return screen
    .getAllByRole("status")
    .flatMap((status) => within(status).queryAllByRole("button"))
    .map((message) => message.textContent);
}
