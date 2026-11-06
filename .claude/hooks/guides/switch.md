# switch

A `switch` lets a case go missing silently: add a variant to `Event` or `ArticleRayon` and every `switch` over it still compiles. Exhaustive matching turns "did I handle every case?" into a compile error.

Pick the shape by where the code lives:

- **Effect code** (`packages/domain`, `packages/wire`, the adapters of `apps/web`): `Match`. The reducer is the model, one handler per event `type`, and a new event fails the build until it has one:

  ```ts
  const applyEvent = Match.type<Event>().pipe(
    Match.discriminatorsExhaustive("type")({
      MagasinCreated: (event) => (state: State) => ...,
      ...
    }),
  );
  ```

  For a `Data.taggedEnum`, its own `$match` does the same on `_tag`.

- **React components**: a ternary for a two-way choice on a tag (`section._tag === "Rayon" ? section.name : "Non classé"` in `ListeView.tsx`); a lookup object typed `Record<Tag, …>` when there are more cases, so a missing key is a type error. Effect stays out of components.

You are done when adding a variant to the matched type breaks the build at this spot.
