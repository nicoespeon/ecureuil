# inline-suppression

A `biome-ignore`, `@ts-expect-error`, `@ts-ignore`, `@ts-nocheck` or `eslint-disable` comment hides a smell from every later reader, human or agent, and from `pnpm check`. This repo keeps zero of them, and the harness denies the edit that adds one.

When a rule fires:

1. Read the guide or the Biome doc the finding points to, and fix the code it describes.
2. If the fix fights the code, the finding is usually naming a missing concept: a decoder, a guard, a smaller function. Find that concept.
3. If the rule is genuinely wrong for this case, change `biome.json` (an `overrides` entry scoped to the files it should not apply to) in a dedicated PR that says why. The repo already does this for `*.config.ts` (tools require a default export) and `*.d.ts` (declaration merging needs `interface`).

You are done when the finding is gone because the code changed, or because a reviewed config change scoped the rule.
