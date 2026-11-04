# 1. Household catalogue with a rayon per store

Date: 2026-11-04

## Status

Accepted

## Context

Our current list (Cookidoo) is flat: the only way to group items is a leading "." hack to sort Costco items first. In the store we scan the whole list at every aisle. We alternate between two stores whose layouts differ, and about 90 % of what we buy is the same items week after week.

## Decision

The household owns a **catalogue of items**. Each item is filed, for each store, under one of that store's **rayons** or marked "not sold here". Rayons are **per-store entities**: each store names and orders its own, by drag & drop, with sensible defaults at creation.

The **list** is a view: the catalogue items currently marked "à acheter", grouped by the active store's rayons in that store's order. "Non classé" sits at the bottom, "Pas chez X" is folded. Switching stores re-sorts the list; it never changes its content.

Adding is a single "Ajouter" field that filters the catalogue (empty field shows the most frequent items); no match creates the item on the fly, to buy and unfiled.

## Consequences

- Configure once, re-add in one gesture: filing an item is done once per store, then the list walks the store in the right order forever.
- Two concepts to maintain (catalogue vs list) instead of one flat list. The quick-add field hides that from daily use.
- Rayon order is store-local, so there is no global aisle taxonomy to agree on, and a new store starts from defaults without touching the others.
- Items are entities with identity, which the event journal (see ADR 2) needs anyway.

## Alternatives rejected

- **Flat list with tags or prefixes** (the current hack): no stable walking order, and tags would have to be re-typed on every add.
- **A global list of aisles shared by all stores**: forces one order on stores that have different layouts; "Boulangerie" is not in the same place at Costco and at Maxi.
- **Rayon on the item, not per store**: same problem; an item needs a different rayon in each store.
