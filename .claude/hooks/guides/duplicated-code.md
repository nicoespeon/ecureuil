# duplicated-code

Advisory: this finding never fails `pnpm check`. Duplication is cheaper than the wrong abstraction, and a clone can be the right call.

A copied block is the cheapest visible sign of a missing abstraction, and copies drift: a fix lands in one and never reaches the other. The fix is rarely "extract a helper"; it is naming the concept both copies reach for.

Read both copies side by side:

1. **Is the other copy already a function you can call?** Call it.
2. **Same idea, or two ideas that happen to look alike?** Two reducer handlers that both rebuild an item are different events with different rules; they look alike and stay apart.
3. **If it is one idea, what is its name?** Write one sentence for what both copies do. If it reads naturally, that is the name of the function, type or module you are missing. If you can only say "the code that does X, Y and Z", the duplication hides two or three smaller abstractions.

**AVOID** mechanical extraction: the matching lines in a function with five parameters and a flag leave the real shape untouched and add a worse name on top. If extracting feels awkward, the abstraction is wrong.

If the copies genuinely diverge, keep them and say why in your summary.
