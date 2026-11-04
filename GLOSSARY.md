# Glossaire

Le langage du domaine est le français : chaque terme ci-dessous est l'identifiant utilisé dans le code. Les verbes des événements et le vocabulaire technique restent en anglais (voir la section Language de `CLAUDE.md`).

- **Foyer** — L'unité à laquelle tout appartient : un catalogue, ses magasins, sa liste, son journal. Deux personnes le partagent aujourd'hui, par deux liens secrets, sans compte.
- **Appareil** (`device`) — Un téléphone ou un ordinateur depuis lequel une personne utilise le foyer, identifié une fois quand il rejoint le foyer. Chaque entrée du journal dit quel appareil l'a écrite, pour distinguer le téléphone du propriétaire de son Mac.
- **Propriétaire / Invité** (`owner` / `guest`) — Les deux rôles du foyer, un par lien secret. Le propriétaire fait les courses, configure et arbitre ; l'invité demande. Chaque entrée du journal dit lequel des deux a agi.
- **Magasin** — Un endroit où l'on fait les courses (Costco, Maxi). Chaque magasin a ses propres rayons ordonnés ; changer de magasin change le tri de la liste, jamais son contenu.
- **Rayon** — Une section d'un magasin, nommée et ordonnée par magasin (glisser-déposer). Un rayon appartient à son magasin : la « Boulangerie » de Costco et celle de Maxi sont deux rayons distincts.
- **Item** — Une entrée du catalogue du foyer : un nom, une quantité (entier, 1 par défaut) et, pour chaque magasin, un rayon, `PasVenduIci` (« Pas chez X ») ou `NonClasse` (« Non classé »). Les items persistent d'une sortie à l'autre ; environ 90 % de ce qu'on achète est ré-ajouté, pas retapé.
- **Liste** — Les items marqués « à acheter ». Vue par magasin, groupée par rayon dans l'ordre du magasin, « Non classé » en bas, « Pas chez X » replié.
- **Panier** — Où va un item coché pendant les courses (« Dans le panier »). Cocher reste réversible jusqu'à la fin de la sortie.
- **Sortie** — Une session de courses dans un magasin, close par « Terminer les courses ». Les items du panier cessent d'être à acheter ; les items non trouvés restent sur la liste et sont rappelés.
- **Achat** — Une ligne d'une sortie : un item et la quantité qui était dans le panier à la fin de la sortie.
- **Demande** — Un item que l'invité propose. Elle entre en tête de la liste du propriétaire, « À valider » (`Pending`), puis devient « dans la liste » (`Accepted`) ou « pas cette fois » (`Refused`). Côté invité, le bouton s'appelle simplement « Ajouter ».
- **Journal** — L'enregistrement générique, append-only et horodaté de tout ce qui s'est passé (qui, depuis quel appareil, dans quel magasin, quoi). C'est la primitive de synchronisation entre appareils : l'état est toujours la relecture du journal par le reducer.
