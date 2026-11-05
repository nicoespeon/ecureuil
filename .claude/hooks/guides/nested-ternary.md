# nested-ternary

A ternary inside another ternary is a decision tree with no names for its branches. The smell is the missing vocabulary, not the punctuation.

A ternary chain switching on one value is a match in disguise: `Match` in Effect code, a lookup object typed `Record<Tag, …>` in a React component (Effect stays out of components). Otherwise, prefer in order:

1. **Name the intermediate condition.** `const isEmpty = liste.sections.length === 0` turns the outer test into a sentence and often makes the inner ternary unnecessary.
2. **Return early.** In a function body, a guard clause beats a conditional expression.
3. **Extract the branch** into a named function or component. If a branch has a name, it deserves one.

A single ternary for a two-way choice stays the house preference: `section._tag === "Rayon" ? section.name : "Non classé"`.
