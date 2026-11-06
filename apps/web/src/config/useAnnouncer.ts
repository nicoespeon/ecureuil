import { useState } from "react";

/** Text for a `role="status"` region, spoken by screen readers each time `announce` is called. */
export function useAnnouncer() {
  const [announcement, setAnnouncement] = useState("");
  return {
    announcement,
    announce: (message: string) =>
      // A live region only speaks when its text changes: repeat with a nbsp.
      setAnnouncement((previous) => (previous === message ? `${message}\u00a0` : message)),
    clear: () => setAnnouncement(""),
  };
}
