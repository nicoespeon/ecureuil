# too-many-parameters

Three parameters is the most this repo accepts. A fourth is a sign of coupling: parameters that travel together across calls are a missing concept, or the function is doing two jobs.

Find which one it is:

1. **Parameters that always travel together** are a concept. Look for an existing type they belong to (an `Event`'s own fields, a `MagasinSeed`), and pass that. `appendProprietaireEvent(journal, { type, magasin, payload })` takes the fields of the event being written, which the function then stamps with `id`, `at` and `device`.
2. **A callback or flag that changes what the function does** means two jobs in one. Split them. `arbitrate(state, demandeId, verdict, then)` became `pendingDemande(state, demandeId)`, a guard each handler calls before settling the demande its own way.
3. **An optional parameter used at one call site** is an exception: express it at that call site. The seed's single invite demande reads `byInvite(draft(...))` instead of `draft` growing a fourth `actor` parameter.

Rewrite each call site with the signature that reads naturally there, and let that shape the function.

**AVOID** an options object that only renames the list (`fn({ a, b, c, d })` where nothing ties `a`–`d` together): it hides the coupling instead of removing it. An object earns its place when it models a real concept.

Test files are exempt: an `it.each` callback takes one parameter per table column.
