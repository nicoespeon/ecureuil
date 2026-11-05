import { EventStore, SyncTransport, sync } from "@ecureuil/domain";
import { Effect } from "effect";

const INTERVAL_MS = 30_000;

/**
 * Runs a sync round now, then whenever the network or the app comes back, and every 30 s
 * while the app is in the foreground.
 * One round at a time: a request during a round runs one more round right after it, so a
 * gesture made meanwhile does not wait for the next trigger.
 */
export function startSync(ports: {
  readonly store: EventStore["Service"];
  readonly transport: SyncTransport["Service"];
}) {
  const round = sync.pipe(
    Effect.provideService(EventStore, ports.store),
    Effect.provideService(SyncTransport, ports.transport),
    Effect.catchTag("TransportError", (error) =>
      Effect.sync(() => console.warn("Sync round failed, the next one will retry", error.cause)),
    ),
  );

  let running = false;
  let requestedMeanwhile = false;
  const requestSync = () => {
    if (running) {
      requestedMeanwhile = true;
      return;
    }
    running = true;
    Effect.runPromise(round)
      .catch((defect: unknown) => console.error("Sync round crashed", defect))
      .finally(() => {
        running = false;
        if (requestedMeanwhile) {
          requestedMeanwhile = false;
          requestSync();
        }
      });
  };

  const syncWhenVisible = () => {
    if (document.visibilityState === "visible") requestSync();
  };

  window.addEventListener("online", requestSync);
  document.addEventListener("visibilitychange", syncWhenVisible);
  const interval = setInterval(syncWhenVisible, INTERVAL_MS);
  requestSync();

  return {
    requestSync,
    stop: () => {
      window.removeEventListener("online", requestSync);
      document.removeEventListener("visibilitychange", syncWhenVisible);
      clearInterval(interval);
    },
  };
}
