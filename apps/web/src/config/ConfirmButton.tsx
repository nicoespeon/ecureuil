import { TrashIcon } from "../liste/ArticleRow";
import { useConfirmation } from "../liste/useConfirmation";

/**
 * A delete that takes two taps: the first arms it and says what follows, until the focus leaves
 * or time runs out. One button for both steps, so the keyboard focus stays on it.
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
  const { confirming, arm, onBlur } = useConfirmation();

  return (
    <button
      type="button"
      onBlur={onBlur}
      onClick={() => {
        if (confirming) return onConfirm();
        arm();
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
  "button-secondary shrink-0 gap-2 px-4 text-base text-red-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700";

const iconButtonClassName =
  "grid size-11 shrink-0 place-items-center rounded-full text-neutral-900 hover:bg-neutral-100 focus-visible:outline-2 focus-visible:outline-blue-700";

const confirmClassName =
  "h-11 shrink-0 rounded-full bg-red-700 px-4 text-sm font-extrabold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700";
