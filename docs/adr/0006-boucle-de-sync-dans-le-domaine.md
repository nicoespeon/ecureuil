# 6. La boucle de sync vit dans le domaine, l'EventStore tient la comptabilité du push

Date : 2026-11-05

## Statut

Accepté. Étend l'[ADR 2](0002-journal-d-evenements-comme-primitive-de-sync.md) : il donne aux ports `EventStore` et `SyncTransport` la forme dont la synchronisation a besoin.

## Contexte

Chaque appareil écrit d'abord dans son journal local, puis pousse ce qui n'est pas encore parti et tire ce que les autres ont écrit, par curseur (ADR 2). Le serveur ignore les ids qu'il connaît déjà, mais l'appareil doit savoir lui-même ce qu'il a poussé : sinon il renverrait tout le journal à chaque tour, et un geste fait pendant un push serait marqué parti sans l'être. Les ports nommés par l'ADR 2 ne disaient rien de cette comptabilité, et rien ne les utilisait.

## Décision

**La boucle est un programme Effect du domaine**, `sync`, qui ne voit que les ports : pousser les événements non poussés, les marquer poussés par leurs ids, tirer depuis le dernier curseur, recevoir ce qui est tiré. `apps/web` fournit les adaptateurs (IndexedDB, `fetch`) en `Layer` et décide quand lancer un tour (geste, retour du réseau, retour au premier plan, intervalle). Les composants React ne voient toujours pas Effect (ADR 3).

**L'`EventStore` tient la comptabilité** : `unpushed`, `markPushed(ids)`, `cursor`, et `receive({ events, cursor })`, qui garde les ids inconnus comme déjà poussés et avance le curseur dans la même transaction. Marquer par ids, pas « tout ce qui précède », laisse en attente un événement écrit pendant le push.

**Le transport échoue de façon typée** (`TransportError`) : hors ligne est attendu, pas un défaut. Un tour qui échoue ne change rien ; le suivant reprend.

## Alternatives écartées

- **Boucle en TypeScript simple dans `apps/web`**, ports du domaine laissés de côté : moins de code d'adaptation, mais la règle de comptabilité vivrait hors du domaine et les ports de l'ADR 2 resteraient décoratifs.
- **Compter sur l'idempotence du serveur** et repousser tout le journal : correct, mais un trafic qui grandit avec le journal et aucune trace locale de ce qui attend.
