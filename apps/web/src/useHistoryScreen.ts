import { useEffect, useState } from "react";

/** `backFromConfiguration` is the liste, giving the focus back to the button that left it. */
type Screen = "liste" | "configuration" | "backFromConfiguration";

/**
 * The configuration is an entry of the browser history: Android's back gesture, like the
 * browser's back button, returns to the liste instead of leaving the app.
 */
export function useHistoryScreen() {
  const [screen, setScreen] = useState<Screen>("liste");

  useEffect(() => {
    const backToListe = () =>
      setScreen((current) => (current === "configuration" ? "backFromConfiguration" : current));
    window.addEventListener("popstate", backToListe);
    return () => window.removeEventListener("popstate", backToListe);
  }, []);

  return {
    screen,
    openConfiguration: () => {
      // Without a URL the address stays as is: the lien's secret already left it.
      history.pushState(null, "");
      setScreen("configuration");
    },
    closeConfiguration: () => {
      setScreen("backFromConfiguration");
      // Its popstate finds the liste already shown, and leaves it as is.
      history.back();
    },
  };
}
