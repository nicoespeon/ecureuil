# tag-literal

A tagged value written by hand (`{ _tag: "Pending" }`) bypasses its constructor: the fields are never checked against the variant, and a renamed tag leaves the literal behind. Build tagged values with their Effect constructor, so the type and the runtime value come from one definition:

```ts
// Data.taggedEnum, in the domain
const DemandeStatus = Data.taggedEnum<DemandeStatus>();
DemandeStatus.Accepted({ articleId });

// Schema.TaggedUnion, in the wire contract
ArticleRayon.cases.Rayon.make({ rayonId });
ArticleRayon.cases.PasVenduIci.make({});
```

Reading a tag is fine: `section._tag === "Rayon"` narrows, it does not build. Tests are exempt, so a `toMatchObject` can describe the expected shape with `_tag`.

You are done when every tagged value in the change comes from a constructor.
