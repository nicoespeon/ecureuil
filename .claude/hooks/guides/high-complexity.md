# high-complexity

High cognitive complexity means one function makes too many decisions at once. The score is the symptom; tangled responsibilities are the cause.

Untangle the decisions:

1. **Lift the guards** into early returns so the real work stays flat. Most reducer handlers start this way: `if (!magasin) return state;`.
2. **Change the shape of what remains.** A chain of conditions on one value is a `Match` (Effect code) or a lookup table in disguise; a nested loop is a `filter` / `map` / `flatMap` pipeline, like `listForMagasin` building the rayons in order.
3. **Give each separate job its own function**, named for the responsibility it handles (`unsetRayon`, `withDemande`, `pendingDemande`).

Describe each branch in one sentence. Two branches with the same sentence belong together; a branch you cannot name cleanly wants its own function.

**AVOID** merging conditions with `&&` / `||` or rewriting branches as ternaries to lower the score: the decisions remain, only the counter moves. You are done when a first-time reader holds the whole function in their head.
