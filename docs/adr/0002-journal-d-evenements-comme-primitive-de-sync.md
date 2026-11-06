# 2. Journal d'événements append-only comme primitive de synchronisation

Date : 2026-11-04

## Statut

Accepté. Étendu par l'[ADR 4](0004-enveloppe-du-journal-et-ordre-de-relecture.md), qui fixe l'enveloppe des événements et l'ordre de relecture derrière les règles de conflit, et par l'[ADR 6](0006-boucle-de-sync-dans-le-domaine.md), qui donne aux ports la comptabilité du push.

## Contexte

La liste doit être réactive et entièrement utilisable hors ligne sur le téléphone du propriétaire en magasin, pendant qu'une deuxième personne ajoute des articles depuis un autre appareil et que le propriétaire configure aussi depuis un Mac. On veut une synchronisation multi-appareils sans tordre un framework généraliste, et une trace de ce qui s'est passé (qui a ajouté quoi, dans quel magasin, quand) pour nourrir des analyses futures comme les suggestions de récurrence.

## Décision

La source de vérité est un **journal d'événements générique, append-only et horodaté** (le « Journal » du glossaire). Chaque événement enregistre qui a agi et le contexte de magasin. L'état de l'application n'est jamais stocké en tant que tel : c'est la **relecture du journal par un reducer pur** (`packages/domain`).

La synchronisation est faite maison et petite : chaque appareil garde son journal local (IndexedDB), pousse ses nouveaux événements vers le serveur et tire ceux des autres par curseur. Les conflits se résolvent par la sémantique de chaque événement : cocher un article est idempotent, une quantité est « dernier écrit gagne », l'arbitrage d'une demande est « premier gagne ».

Le domaine ne voit que trois ports, modélisés comme services Effect : `EventStore` (journal local), `SyncTransport` (push/pull par curseur) et `Clock`. N'importe quel framework de synchronisation peut remplacer le fait maison derrière ces ports.

Aucune analyse n'est construite sur le journal en v1 ; il est seulement conservé pour que les fonctionnalités futures aient les données.

## Conséquences

- Hors ligne est le défaut, pas un mode : chaque action est un ajout local ; la synchronisation est une tâche de fond.
- La gestion des conflits est explicite et minuscule parce que le vocabulaire d'événements est minuscule.
- Le journal grandit sans fin. Acceptable pour les courses d'un foyer ; compaction ou instantanés peuvent venir plus tard derrière les mêmes ports.
- La forme de l'état peut changer librement : elle est dérivée, donc un nouveau reducer relit le même journal.
- Le reducer et les événements sont purs et sans framework : tout le domaine se teste unitairement sans navigateur ni serveur.

## Alternatives écartées

- **Convex** : modèle temps réel séduisant, mais pas de persistance locale, et son moteur hors ligne a été archivé en septembre 2026. Hors ligne en magasin n'est pas négociable.
- **Bibliothèques CRDT (Automerge, Yjs)** : une sémantique de fusion généraliste dont on n'a pas besoin, une grosse dépendance sur le chemin critique, et moins de contrôle sur les règles de conflit par événement qu'on veut vraiment.
- **REST avec serveur faisant autorité et UI optimiste** : plus simple sur le papier, mais les écritures hors ligne auraient de toute façon besoin d'une file et d'une réconciliation, c'est-à-dire cette conception avec moins de structure.
