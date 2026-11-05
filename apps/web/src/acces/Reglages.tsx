import type { Actor } from "@ecureuil/wire";
import { useId, useState, useSyncExternalStore } from "react";
import { deviceName, rememberDeviceName } from "../journal/device";
import { buttonClassName, inputClassName } from "./Accueil";
import type { AccesStore } from "./acces";
import { CollerLeLien } from "./CollerLeLien";
import { NouveauLienMariane } from "./NouveauLienMariane";

/** This device: its name, its role, and for the proprietaire, Mariane's lien. */
export function Reglages({ acces }: { acces: AccesStore }) {
  const state = useSyncExternalStore(acces.subscribe, acces.get);
  const accesId = useId();

  return (
    <div className="flex flex-col gap-8 px-4 py-6">
      <h2 className="text-2xl font-semibold">Réglages</h2>
      <NomAppareil />
      <section aria-labelledby={accesId} className="flex flex-col gap-3">
        <h3 id={accesId} className="text-lg font-semibold">
          Accès
        </h3>
        {state._tag === "SansLien" && (
          <>
            <p className="text-neutral-700">
              Cet appareil n'a pas de lien : il fonctionne seul, sans synchronisation.
            </p>
            <CollerLeLien openLien={acces.openLien} />
          </>
        )}
        {state._tag === "Connecte" && (
          <dl className="flex gap-2">
            <dt className="text-neutral-700">Rôle</dt>
            <dd className="font-medium">{roleLabels[state.role]}</dd>
          </dl>
        )}
        {state._tag === "Connecte" &&
          state.role === "proprietaire" &&
          state.invite !== undefined && (
            <NouveauLienMariane invite={state.invite} newInviteLien={acces.newInviteLien} />
          )}
      </section>
    </div>
  );
}

const roleLabels = { proprietaire: "Propriétaire", invite: "Invité" } satisfies Record<
  Actor,
  string
>;

function NomAppareil() {
  const [name, setName] = useState(() => deviceName() ?? "");
  const [saved, setSaved] = useState(false);
  const inputId = useId();

  return (
    <form
      className="flex flex-col gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        if (name.trim() === "") return;
        rememberDeviceName(name.trim());
        setSaved(true);
      }}
    >
      <label htmlFor={inputId} className="font-medium">
        Nom de l'appareil
      </label>
      <input
        id={inputId}
        required
        value={name}
        onChange={(event) => {
          setName(event.target.value);
          setSaved(false);
        }}
        placeholder="Téléphone de Nicolas"
        className={inputClassName}
      />
      <button type="submit" className={buttonClassName}>
        Enregistrer
      </button>
      <p role="status" className="text-sm">
        {saved ? "Nom enregistré" : ""}
      </p>
    </form>
  );
}
