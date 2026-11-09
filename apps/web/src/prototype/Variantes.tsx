import { useState } from "react";
import { showMessage } from "./message";

const positions = [
  { key: "a", label: "A · En bas" },
  { key: "b", label: "B · En haut" },
] as const;

const icones = [
  { key: "oui", label: "Avec icônes" },
  { key: "non", label: "Sans icônes" },
] as const;

const ecrans = [
  { query: "", label: "Propriétaire" },
  { query: "?role=invite", label: "Invitée" },
] as const;

/**
 * Throwaway: the variant lives on <html>. Position A lifts the page above the keyboard, which
 * Chrome only reads from the viewport meta: a change reloads.
 */
export function applyVariante(params: URLSearchParams) {
  const position = params.get("position") ?? read("position") ?? "a";
  const icone = params.get("icones") ?? read("icones") ?? "oui";
  document.documentElement.dataset.position = position;
  document.documentElement.dataset.icones = icone;
  const viewport = document.querySelector('meta[name="viewport"]');
  viewport?.setAttribute(
    "content",
    position === "a"
      ? "width=device-width, initial-scale=1.0, interactive-widget=resizes-content"
      : "width=device-width, initial-scale=1.0",
  );
}

function read(key: string) {
  try {
    return localStorage.getItem(`prototype.${key}`);
  } catch {
    return null;
  }
}

function choose(key: string, value: string) {
  try {
    localStorage.setItem(`prototype.${key}`, value);
  } catch {
    // Storage blocked: the URL carries the choice.
  }
  const url = new URL(location.href);
  url.searchParams.set(key, value);
  location.assign(url);
}

export function VariantesSwitcher() {
  const [open, setOpen] = useState(false);
  const { position, icones: icone } = document.documentElement.dataset;
  return (
    <div className="fixed top-20 right-2 z-50 flex flex-col items-end gap-2 text-sm">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        className="min-h-11 rounded-full bg-neutral-950 px-4 font-bold text-white shadow-xl"
      >
        {position?.toUpperCase()} · {icone === "non" ? "sans" : "avec"}
      </button>
      {open && (
        <div className="flex flex-col gap-1 rounded-2xl bg-neutral-950 p-2 text-white shadow-xl">
          {positions.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              aria-pressed={key === position}
              onClick={() => choose("position", key)}
              className="min-h-11 rounded-xl px-3 text-left aria-pressed:bg-white aria-pressed:text-neutral-950"
            >
              {label}
            </button>
          ))}
          <hr className="my-1 border-white/30" />
          {icones.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              aria-pressed={key === icone}
              onClick={() => choose("icones", key)}
              className="min-h-11 rounded-xl px-3 text-left aria-pressed:bg-white aria-pressed:text-neutral-950"
            >
              {label}
            </button>
          ))}
          <hr className="my-1 border-white/30" />
          <button
            type="button"
            onClick={() => showMessage("Déjà sur la liste : Lait", "deja")}
            className="min-h-11 rounded-xl px-3 text-left"
          >
            Essayer un message
          </button>
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
    </div>
  );
}
