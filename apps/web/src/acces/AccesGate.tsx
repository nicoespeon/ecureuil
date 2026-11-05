import type { Actor } from "@ecureuil/wire";
import { type ReactNode, useSyncExternalStore } from "react";
import { Accueil, buttonClassName } from "./Accueil";
import type { AccesStore } from "./acces";
import { CollerLeLien } from "./CollerLeLien";

/** Opens the app once the role of this device is known, and says why when it cannot. */
export function AccesGate({
  acces,
  children,
}: {
  acces: AccesStore;
  children: (role: Actor) => ReactNode;
}) {
  const state = useSyncExternalStore(acces.subscribe, acces.get);

  if (state._tag === "SansLien") return children("proprietaire");
  if (state._tag === "Connecte") return children(state.role);
  if (state._tag === "Invalide") {
    return (
      <Accueil title="Ce lien ne marche plus">
        <p className="text-lg text-neutral-700">
          Il a sans doute été remplacé par un nouveau lien. Collez le nouveau ici.
        </p>
        <CollerLeLien openLien={acces.openLien} />
      </Accueil>
    );
  }
  return (
    <Accueil title="Écureuil">
      <p role="status" className="text-lg">
        {state._tag === "Verification"
          ? "Connexion en cours…"
          : "Connexion impossible. Vérifiez le réseau."}
      </p>
      {state._tag === "HorsLigne" && (
        <button type="button" onClick={() => void acces.verify()} className={buttonClassName}>
          Réessayer
        </button>
      )}
    </Accueil>
  );
}
