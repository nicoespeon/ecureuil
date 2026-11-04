# 4. Enveloppe du journal, et un seul ordre de relecture : horodatage puis id d'événement

Date : 2026-11-04

## Statut

Accepté. Étend l'[ADR 2](0002-event-log-as-sync-primitive.md) : il rend concrètes les règles de conflit que l'ADR 2 nomme ; l'ADR 2 reste en vigueur.

## Contexte

L'ADR 2 résout les conflits par la sémantique de chaque événement : cocher est idempotent, une quantité est « dernier écrit gagne », l'arbitrage d'une demande est « premier gagne », les suppressions sont des pierres tombales. Les appareils écrivent hors ligne et synchronisent plus tard, donc les événements arrivent dans le désordre et parfois deux fois. Garder une version par champ dans l'état (un horodatage par quantité, par rayon d'item, des ensembles de pierres tombales) disperserait les règles de conflit dans tout le reducer. Le journal doit aussi rester lisible par des analyses futures sans connaître chaque payload.

## Décision

**Enveloppe.** Chaque événement est `{ id, at, actor, device, magasin, type, payload }` : un id unique, l'horloge de l'appareil en millisecondes epoch, qui a agi (`owner` ou `guest`), quel appareil l'a écrit (un id opaque généré une fois par appareil), le magasin où se trouvait l'acteur, puis le payload propre à l'événement. Les événements liés à un magasin (rayons, rayon d'un item, fin de sortie) exigent un magasin ; les événements du foyer (catalogue, liste, panier, demandes) le portent comme contexte, nullable. Le rôle fait autorité pour les permissions ; l'appareil sert à la comptabilité de synchronisation et aux analyses, et aucune règle ne dépend de lui. Le schéma vit dans `@ecureuil/wire`, pour que web et API valident le même contrat.

**Ordre de relecture.** `fold(events)` élimine les ids en double, trie par `(at, id)` et réduit dans cet ordre. Les règles de conflit en découlent : « dernier écrit gagne » est « dernier dans l'ordre », « premier gagne » est « une demande qui n'est plus en attente ignore les verdicts suivants », les pierres tombales sont « les événements sur une entité disparue sont ignorés, et un id n'est jamais réutilisé ».

## Conséquences

- L'état ne stocke aucune version et le reducer reste un simple dispatch ; les règles sont visibles en un seul endroit.
- Chaque appareil calcule le même ordre, donc tous convergent vers le même état quel que soit l'ordre d'arrivée.
- Un décalage d'horloge entre les deux téléphones peut réordonner des modifications concurrentes du même champ. Acceptable pour une liste de courses : les deux personnes touchent rarement la même chose dans la fenêtre du décalage.
- `fold` trie tout le journal ; suffisant pour un foyer, et la compaction peut venir plus tard derrière les ports (ADR 2).
- Un événement écrit est immuable. Corriger une erreur, c'est écrire un nouvel événement.

## Alternatives écartées

- **Horodatage par champ ou horloges vectorielles** : plus d'état et plus de code pour le même résultat à deux appareils.
- **Ordre attribué par le serveur** : inconnu hors ligne, et les propres événements d'un appareil se réordonneraient après synchronisation.
- **Événements plats sans enveloppe** : plus courts à écrire, mais le serveur et les analyses futures devraient connaître chaque payload pour lire qui, quand et où.
