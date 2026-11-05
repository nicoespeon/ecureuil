# oversized-file

Covers files over 300 lines (500 for tests) and functions over 50 lines. The smell is poor cohesion, a unit that asks the reader to hold too many ideas at once, not the raw count.

**A long function** usually runs several steps in sequence. Name each step and extract it, so the function reads as the list of those names. Guards and the happy path often separate first (see `high-complexity.md`).

**A long file** splits along a seam: a type and its operations, a pipeline, one concern per module. `packages/domain` already works this way: `reducer.ts` folds events into a state, `list.ts` derives the list for one magasin from it, `seed.ts` holds the fixture.

Write one sentence describing what each new module would be responsible for. If you cannot, you have not found the seam yet: keep looking before you split.

**AVOID** mechanical splits: carving a file in half, or moving every private helper into a `utils.ts`, passes the threshold and moves the cohesion problem somewhere else.

**Test files** split by behaviour: each top-level `describe` is usually its own file, named after the module plus the intent (`reducer.demandes.test.ts`). Move shared fixtures to a sibling helper once a second file needs them, not before.
