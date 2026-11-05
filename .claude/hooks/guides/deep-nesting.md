# deep-nesting

Nested blocks (an `if` inside a `for` inside an `if`) make the reader hold every enclosing condition at once. The smell is too much branching in one place, not the indentation.

Read the nesting from the inside out and ask what the innermost block actually needs. Most enclosing conditions are guards. Prefer, in order:

1. **Guard clauses.** Invert the condition and `return` (or `continue`) early; each guard lifted removes a level from everything below it.
2. **Extract a named sub-step** when an inner block is a coherent piece of work.
3. **Replace the structure**: a ladder of conditions is often a `Match` or a lookup table; a nested loop is often a `filter` / `flatMap` pipeline.

**AVOID** merging conditions with `&&` just to drop a level: that trades vertical nesting for an unreadable horizontal condition. You are done when the function's shape reads at a glance.
