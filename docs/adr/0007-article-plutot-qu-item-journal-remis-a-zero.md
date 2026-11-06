# 7. `Article` plutôt qu'`Item`, renommage franc avec remise à zéro du journal

Date : 2026-11-06

## Statut

Accepté.

## Contexte

L'entrée du catalogue s'appelait `Item`. Le mot sonne faux en français, dans l'interface (« Item à ajouter ») comme dans le code, alors que le langage du domaine est le français. Le nom est aussi de la donnée : le `type` de chaque événement (`ItemCreated`, `ItemRayonSet`…) et ses champs (`itemId`) sont écrits tels quels dans la table D1 `journal` et dans IndexedDB sur chaque appareil (ADR 2, ADR 4). Le journal ne contient aujourd'hui que le seed et quelques jours d'usage par un seul foyer.

## Décision

**`Item` devient `Article`, partout** : glossaire, identifiants, événements (`ArticleCreated`, `ArticleRayonSet`…), champs (`articleId`), textes de l'interface.

**Le renommage est franc, sans migration.** Le schéma `Event` ne connaît plus les anciens `type` ; aucun code ne les lit ni ne les traduit. Après le déploiement, le journal de production est vidé et ré-ensemencé, et chaque appareil efface les données du site avant de recoller son lien.

## Conséquences

- Les événements `Item*` déjà écrits ne passent plus le schéma : le journal de production et celui de chaque appareil doivent être vidés au déploiement.
- L'historique (sorties passées, achats) du journal actuel est perdu.

## Alternatives écartées

- **Garder `Item`** : un anglicisme au cœur du vocabulaire, dans l'interface comme dans le code.
- **Migrer le journal** (réécrire les événements en D1 et en IndexedDB) ou **décoder les deux noms** : du code permanent pour quelques jours de données d'un seul foyer, qui se recréent en quelques minutes.
