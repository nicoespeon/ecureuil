import { useId, useState } from "react";
import { buttonClassName } from "./Accueil";

/** An installed PWA has no address bar: the lien is pasted here instead. */
export function CollerLeLien({ openLien }: { openLien: (pasted: string) => void }) {
  const [pasted, setPasted] = useState("");
  const inputId = useId();

  return (
    <form
      className="flex flex-col gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        if (pasted.trim() !== "") openLien(pasted);
      }}
    >
      <label htmlFor={inputId} className="font-medium">
        Lien d'accès
      </label>
      <input
        id={inputId}
        type="text"
        inputMode="url"
        required
        autoComplete="off"
        value={pasted}
        onChange={(event) => setPasted(event.target.value)}
        placeholder="https://…/#…"
        className="h-12 rounded-md border border-neutral-400 px-3 text-base focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
      />
      <button type="submit" className={buttonClassName}>
        Utiliser ce lien
      </button>
    </form>
  );
}
