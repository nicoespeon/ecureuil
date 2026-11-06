/**
 * PROTOTYPE, jetable (branche prototype/deux-modes, jamais mergée) : trois façons de passer de
 * « Préparer » à « Courses », à comparer sur le téléphone avec `?variante=A|B|C`.
 */
import { useState } from "react";

export type Mode = "preparer" | "courses";
export type Variante = "A" | "B" | "C";

const variantes: ReadonlyArray<{ key: Variante; name: string }> = [
  { key: "A", name: "Segmented control" },
  { key: "B", name: "Barre du bas" },
  { key: "C", name: "Interrupteur" },
];

const MODE_KEY = "ecureuil.mode";

export function useMode() {
  const [mode, setModeState] = useState<Mode>(() =>
    localStorage.getItem(MODE_KEY) === "courses" ? "courses" : "preparer",
  );
  return {
    mode,
    setMode: (next: Mode) => {
      localStorage.setItem(MODE_KEY, next);
      setModeState(next);
    },
  };
}

export function useVariante() {
  const [variante, setVarianteState] = useState<Variante>(() => {
    const fromUrl = new URLSearchParams(location.search).get("variante");
    return variantes.find((v) => v.key === fromUrl)?.key ?? "A";
  });
  return {
    variante,
    setVariante: (next: Variante) => {
      history.replaceState(history.state, "", `?variante=${next}`);
      setVarianteState(next);
    },
  };
}

/** Variante A: two named segments under the magasin tabs. */
export function SegmentedMode({ mode, setMode }: { mode: Mode; setMode: (mode: Mode) => void }) {
  return (
    <fieldset className="flex h-12 items-center border-b border-neutral-300 bg-white px-3">
      <legend className="sr-only">Mode</legend>
      <div className="grid h-10 w-full grid-cols-2 rounded-lg bg-neutral-100 p-1">
        {(["preparer", "courses"] as const).map((value) => (
          <label
            key={value}
            className="grid cursor-pointer place-items-center rounded-md text-base font-medium text-neutral-700 has-checked:bg-white has-checked:text-neutral-950 has-checked:shadow has-focus-visible:outline-2 has-focus-visible:outline-blue-700"
          >
            <input
              type="radio"
              name="mode"
              value={value}
              checked={mode === value}
              onChange={() => setMode(value)}
              className="sr-only"
            />
            {value === "preparer" ? "Préparer" : "Courses"}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

/** Variante B: the bottom bar carries the way in and the way out. */
export function BottomModeButton({
  mode,
  setMode,
}: {
  mode: Mode;
  setMode: (mode: Mode) => void;
}) {
  return mode === "preparer" ? (
    <button
      type="button"
      onClick={() => setMode("courses")}
      className={`${buttonClassName} grow bg-neutral-900 text-white`}
    >
      Faire les courses
    </button>
  ) : (
    <button
      type="button"
      onClick={() => setMode("preparer")}
      className={`${buttonClassName} grow border border-neutral-400 bg-white`}
    >
      <span aria-hidden="true" className="mr-2">
        ←
      </span>
      Préparer
    </button>
  );
}

/** Variante C: a switch next to the gear. */
export function SwitchMode({ mode, setMode }: { mode: Mode; setMode: (mode: Mode) => void }) {
  const on = mode === "courses";
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={() => setMode(on ? "preparer" : "courses")}
      className="flex h-11 items-center gap-2 rounded-md px-2 text-base font-medium focus-visible:outline-2 focus-visible:outline-blue-700"
    >
      Courses
      <span
        aria-hidden="true"
        className={`flex h-6 w-11 items-center rounded-full p-0.5 motion-safe:transition-colors ${on ? "bg-neutral-900" : "bg-neutral-300"}`}
      >
        <span
          className={`size-5 rounded-full bg-white shadow motion-safe:transition-transform ${on ? "translate-x-5" : ""}`}
        />
      </span>
    </button>
  );
}

/** Not part of the design: flips between the variantes. */
export function PrototypeSwitcher({
  variante,
  setVariante,
}: {
  variante: Variante;
  setVariante: (variante: Variante) => void;
}) {
  const index = variantes.findIndex((v) => v.key === variante);
  const go = (step: number) =>
    setVariante(variantes[(index + step + variantes.length) % variantes.length]?.key ?? "A");
  const current = variantes[index];

  return (
    <div className="fixed bottom-[calc(5.5rem+env(safe-area-inset-bottom))] left-1/2 z-50 -translate-x-1/2 flex items-center gap-1 whitespace-nowrap rounded-full bg-fuchsia-700 px-1 text-sm text-white shadow-lg">
      <button type="button" aria-label="Variante précédente" onClick={() => go(-1)} className="size-9">
        ‹
      </button>
      <span>
        {current?.key} · {current?.name}
      </span>
      <button type="button" aria-label="Variante suivante" onClick={() => go(1)} className="size-9">
        ›
      </button>
    </div>
  );
}

const buttonClassName =
  "h-12 whitespace-nowrap rounded-md px-4 text-base font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700";
