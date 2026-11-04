# Glossary

The domain vocabulary is French, as in the UI. Code uses the English names in parentheses.

- **Foyer** (household) — The unit everything belongs to: one catalogue, its stores, its list, its journal. Two people share it today, through two secret links (owner and guest), with no accounts.
- **Propriétaire / Invité** (owner / guest) — The two roles of the foyer, one per secret link. The owner shops, configures and arbitrates; the guest requests. Every journal entry records which of the two acted.
- **Magasin** (store) — A place we shop at (Costco, Maxi). Each store has its own ordered rayons; switching the active store changes how the list is sorted, never what it contains.
- **Rayon** (aisle) — A section of one store, named and ordered per store by drag & drop. Rayons are store-scoped entities: Costco's "Boulangerie" and Maxi's "Boulangerie" are two different rayons.
- **Item** — An entry of the household catalogue: a name, a quantity (integer, default 1) and, for each store, a rayon or "not sold here". Items persist across trips; about 90 % of what we buy is re-added, not retyped.
- **Classement** (filing) — Where an item sits in one store: under one of that store's rayons, or "pas vendu ici" (not sold here). An item with no classement in a store is "Non classé" (unfiled) there.
- **Liste** (list) — The items currently marked "à acheter" (to buy). Viewed per store, grouped by rayon in that store's order, with "Non classé" (unfiled) at the bottom and "Pas chez X" (not sold here) folded away.
- **Panier** (cart) — Where a checked item goes while shopping ("Dans le panier"). Checking is reversible until the trip ends.
- **Sortie** (trip) — One shopping run at one store, closed by "Terminer les courses". Items in the cart stop being "à acheter"; items not found stay on the list and are called out.
- **Achat** (purchase) — One line of a sortie: an item and the quantity that was in the cart when the trip ended.
- **Demande** (request) — An item the guest suggests. It enters the owner's list under "À valider" (pending), then becomes "dans la liste" (accepted) or "pas cette fois" (declined). The guest sees the button as plain "Ajouter".
- **Journal** (event log) — The generic, append-only, timestamped record of everything that happened (who, which store, what). It is the sync primitive between devices: state is always the replay of the journal through the reducer.
