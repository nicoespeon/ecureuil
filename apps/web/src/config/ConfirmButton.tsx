import { useEffect, useState } from "react";
import { TrashIcon } from "../liste/ArticleRow";

const CONFIRMATION_MS = 3000;

/**
 * A delete that takes two taps: the first one arms it for a few seconds and says what follows.
 * One button for both steps, so the keyboard focus stays on it.
 */
export function ConfirmButton({
  subject,
  warning,
  onConfirm,
  withLabel = false,
}: {
  subject: string;
  warning: { announce: (message: string) => void; message: string };
  onConfirm: () => void;
  withLabel?: boolean;
}) {
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    if (!confirming) return;
    const timeout = setTimeout(() => setConfirming(false), CONFIRMATION_MS);
    return () => clearTimeout(timeout);
  }, [confirming]);

  return (
    <button
      type="button"
      onClick={() => {
        if (confirming) return onConfirm();
        setConfirming(true);
        warning.announce(warning.message);
      }}
      className={idleOrConfirmClassName({ confirming, withLabel })}
    >
      {confirming ? (
        <>
          Confirmer<span className="sr-only"> la suppression de {subject}</span>
        </>
      ) : (
        <>
          <TrashIcon />
          <span className={withLabel ? undefined : "sr-only"}>Supprimer</span>
          <span className="sr-only"> {subject}</span>
        </>
      )}
    </button>
  );
}

function idleOrConfirmClassName({
  confirming,
  withLabel,
}: {
  confirming: boolean;
  withLabel: boolean;
}) {
  if (confirming) return confirmClassName;
  return withLabel ? labelButtonClassName : iconButtonClassName;
}

const labelButtonClassName =
  "flex h-11 shrink-0 items-center gap-2 rounded-md border border-neutral-400 px-3 text-base font-medium text-red-800 hover:bg-neutral-100 focus-visible:outline-2 focus-visible:outline-blue-700";

const iconButtonClassName =
  "grid size-11 shrink-0 place-items-center rounded-md text-neutral-900 hover:bg-neutral-100 focus-visible:outline-2 focus-visible:outline-blue-700";

const confirmClassName =
  "h-11 shrink-0 rounded-md bg-red-700 px-3 text-sm font-semibold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700";
