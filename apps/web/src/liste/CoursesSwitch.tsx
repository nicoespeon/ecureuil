import type { Mode } from "./useMode";

/** Off, the list is prepared; on, the courses are done. The word keeps it named for everyone. */
export function CoursesSwitch({ mode, setMode }: { mode: Mode; setMode: (mode: Mode) => void }) {
  const on = mode === "courses";
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={() => setMode(on ? "preparer" : "courses")}
      className="flex h-11 items-center gap-2 rounded-md px-2 text-base font-medium text-neutral-900 focus-visible:outline-2 focus-visible:outline-blue-700"
    >
      Courses
      <span
        aria-hidden="true"
        className={`flex h-6 w-11 shrink-0 items-center rounded-full p-0.5 motion-safe:transition-colors ${on ? "bg-neutral-900" : "bg-neutral-500"}`}
      >
        <span
          className={`size-5 rounded-full bg-white shadow motion-safe:transition-transform ${on ? "translate-x-5" : ""}`}
        />
      </span>
    </button>
  );
}
