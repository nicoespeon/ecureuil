import type { Celebration } from "./celebration";
import { Ecureuil } from "./Ecureuil";

export function CelebrationBanner({
  celebration,
  onDismiss,
}: {
  celebration: Celebration;
  onDismiss: () => void;
}) {
  const { title, detail, pose, dismissable } = celebration;
  return (
    <div
      className={`m-3 flex items-center gap-3 rounded-lg border p-3 ${pose === "hop" ? "border-emerald-200 bg-emerald-50 text-emerald-900" : "border-neutral-200 bg-neutral-50 text-neutral-800"}`}
    >
      {/* Keyed on the title: a new moment hops again, a re-render does not. */}
      <span key={title} className={`shrink-0 ${pose === "hop" ? "hop" : ""}`}>
        <Ecureuil size={64} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-semibold">{title}</p>
        {detail && <p className="text-sm">{detail}</p>}
      </div>
      {dismissable && (
        <button
          type="button"
          aria-label="Fermer"
          onClick={onDismiss}
          className="grid size-11 shrink-0 place-items-center rounded-md text-xl hover:bg-white/60 focus-visible:outline-2 focus-visible:outline-blue-700"
        >
          <span aria-hidden="true">×</span>
        </button>
      )}
    </div>
  );
}
