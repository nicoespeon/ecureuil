import type { RefObject } from "react";
import { celebrationFor } from "./celebration";
import { Ecureuil } from "./Ecureuil";

/** The squirrel's message for the list as it stands, if the moment calls for one. */
export function CelebrationBanner({
  moment,
  dismiss,
  focusAfterDismiss,
}: {
  moment: Parameters<typeof celebrationFor>[0];
  dismiss: () => void;
  /** The close button leaves with the message: the focus goes here instead of the page. */
  focusAfterDismiss: RefObject<HTMLElement | null>;
}) {
  const celebration = celebrationFor(moment);
  if (!celebration) return null;
  const { title, detail, pose, dismissable } = celebration;
  return (
    <div
      className={`clay mx-3 mt-4 flex items-center gap-3 rounded-lg p-3 ${pose === "hop" ? "bg-emerald-50 text-emerald-900" : "bg-white text-neutral-800"}`}
    >
      {/* Keyed on the title: a new moment hops again, a re-render does not. */}
      <span key={title} className={`shrink-0 ${pose === "hop" ? "hop" : ""}`}>
        <Ecureuil size={64} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-lg font-black">{title}</p>
        {detail && <p className="text-sm font-semibold">{detail}</p>}
      </div>
      {dismissable && (
        <button
          type="button"
          aria-label="Fermer le message"
          onClick={() => {
            dismiss();
            focusAfterDismiss.current?.focus();
          }}
          className="grid size-11 shrink-0 place-items-center rounded-full text-xl hover:bg-neutral-100 focus-visible:outline-2 focus-visible:outline-blue-700"
        >
          <span aria-hidden="true">×</span>
        </button>
      )}
    </div>
  );
}
