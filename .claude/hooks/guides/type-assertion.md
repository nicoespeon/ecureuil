# type-assertion

Covers `as X`, `<X>value`, the non-null `!` and `any`. Each one tells the compiler to stop checking: when the value does not match, nothing fails where the cast is, and the wrong shape travels on until it breaks somewhere unrelated.

`as const` is exempt: it narrows a literal, it does not override a type.

Each finding falls in one of three cases:

1. **The compiler already knows the type.** Delete the cast. If the build breaks, the cast was hiding a real mismatch: fix the types.
2. **The data comes from outside the code** (`fetch`, `JSON.parse`, `localStorage`, a D1 row, a request body). Decode it once, where it enters, with the Effect Schema from `@ecureuil/wire`, then trust the decoded type everywhere after:

   ```ts
   const decodePush = Schema.decodeUnknownResult(Schema.fromJsonString(PushRequest));
   ```

   `unknown` is the honest type before decoding; `any` never is.
3. **A value that may be absent** (`state.articles[articleId]`, `document.getElementById`). Narrow it: an early return, optional chaining, or a guard that returns the narrowed value, like `pendingDemande` in `reducer.ts`. `main.tsx` checks `if (!root)` and throws a named error instead of writing `root!`.

You are done when the type comes from a decoder, a guard or inference, and the compiler checks every use after it.
