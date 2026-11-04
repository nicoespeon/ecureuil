# Glossary

Code, documents and this glossary use the English names. The UI speaks French: each entry gives its French label, and the quoted strings are what the screen shows.

- **Household** (foyer) — The unit everything belongs to: one catalogue, its stores, its list, its journal. Two people share it today, through two secret links (owner and guest), with no accounts.
- **Device** (appareil) — One phone or computer a person uses the household from, identified once when it joins. Every journal entry says which device wrote it, so the owner's phone and the owner's Mac can be told apart.
- **Owner / Guest** (propriétaire / invité) — The two roles of the household, one per secret link. The owner shops, configures and arbitrates; the guest requests. Every journal entry records which of the two acted.
- **Store** (magasin) — A place we shop at (Costco, Maxi). Each store has its own ordered aisles; switching the active store changes how the list is sorted, never what it contains.
- **Aisle** (rayon) — A section of one store, named and ordered per store by drag & drop. Aisles are store-scoped entities: Costco's "Boulangerie" and Maxi's "Boulangerie" are two different aisles.
- **Item** (item) — An entry of the household catalogue: a name, a quantity (integer, default 1) and, for each store, an aisle or "not sold here". Items persist across trips; about 90 % of what we buy is re-added, not retyped.
- **Filing** (classement) — Where an item sits in one store: under one of that store's aisles, or not sold here ("Pas chez X"). An item with no filing in a store is unfiled there ("Non classé").
- **List** (liste) — The items currently marked to buy ("à acheter"). Viewed per store, grouped by aisle in that store's order, with the unfiled items at the bottom and the ones not sold here folded away.
- **Cart** (panier) — Where a checked item goes while shopping ("Dans le panier"). Checking is reversible until the trip ends.
- **Trip** (sortie) — One shopping run at one store, closed by "Terminer les courses". Items in the cart stop being to buy; items not found stay on the list and are called out.
- **Purchase** (achat) — One line of a trip: an item and the quantity that was in the cart when the trip ended.
- **Request** (demande) — An item the guest suggests. It enters the owner's list as pending ("À valider"), then becomes accepted ("dans la liste") or declined ("pas cette fois"). The guest sees the button as plain "Ajouter".
- **Journal** (journal) — The generic, append-only, timestamped record of everything that happened (who, from which device, in which store, what). It is the sync primitive between devices: state is always the replay of the journal through the reducer.
