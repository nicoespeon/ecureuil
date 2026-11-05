import type { ComponentProps } from "react";
import { fieldClassName } from "./classNames";

/**
 * A name saved when the field is left or on Enter, only if it changed. An empty name puts the
 * current one back: the journal refuses empty names.
 */
export function NameInput({
  name,
  rename,
  ...props
}: { name: string; rename: (name: string) => void } & Pick<
  ComponentProps<"input">,
  "id" | "aria-label"
>) {
  return (
    <input
      {...props}
      // A new name from another device replaces whatever was typed here.
      key={name}
      defaultValue={name}
      autoComplete="off"
      onBlur={(event) => {
        const typed = event.currentTarget.value.trim();
        if (typed === "") event.currentTarget.value = name;
        else if (typed !== name) rename(typed);
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter") event.currentTarget.blur();
      }}
      className={fieldClassName}
    />
  );
}
