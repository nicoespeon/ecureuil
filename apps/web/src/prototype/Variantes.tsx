import { useState } from "react";

const variantes = [
  { key: "a1", label: "A1 · Galets" },
  { key: "a2", label: "A2 · Doux" },
  { key: "a3", label: "A3 · Teinté" },
] as const;

const ecrans = [
  { query: "", label: "Propriétaire" },
  { query: "?role=invite", label: "Invitée" },
  { query: "?vide", label: "Nouvel appareil" },
] as const;

type Variante = (typeof variantes)[number]["key"];

/** Throwaway: the design variant lives on <html>, chosen here or by `?variante=`. */
export function applyVariante(params: URLSearchParams) {
  const asked = variantes.find(({ key }) => key === params.get("variante"));
  const stored = variantes.find(({ key }) => key === readStored());
  setVariante(asked?.key ?? stored?.key ?? "a1");
}

function readStored() {
  try {
    return localStorage.getItem("prototype.variante");
  } catch {
    return null;
  }
}

function setVariante(variante: Variante) {
  document.documentElement.dataset.variante = variante;
  try {
    localStorage.setItem("prototype.variante", variante);
  } catch {
    // Storage blocked: the variant holds until the next reload.
  }
}

export function VariantesSwitcher() {
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState(document.documentElement.dataset.variante);
  return (
    <div className="fixed right-2 bottom-24 z-50 flex flex-col items-end gap-2 text-sm">
      {open && (
        <div className="flex flex-col gap-1 rounded-2xl bg-neutral-950 p-2 text-white shadow-xl">
          {variantes.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              aria-pressed={key === current}
              onClick={() => {
                setVariante(key);
                setCurrent(key);
              }}
              className="min-h-11 rounded-xl px-3 text-left aria-pressed:bg-white aria-pressed:text-neutral-950"
            >
              {label}
            </button>
          ))}
          <hr className="my-1 border-white/30" />
          {ecrans.map(({ query, label }) => (
            <a
              key={label}
              href={`/${query}`}
              className="grid min-h-11 items-center rounded-xl px-3"
            >
              {label}
            </a>
          ))}
        </div>
      )}
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        className="min-h-11 rounded-full bg-neutral-950 px-4 font-bold text-white shadow-xl"
      >
        Variante {current?.toUpperCase()}
      </button>
    </div>
  );
}
