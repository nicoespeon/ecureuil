import { type ComponentProps, useEffect, useRef } from "react";
import { fieldClassName } from "./classNames";

/**
 * A name saved on Enter or when the field is left, only if it changed. An empty name puts the
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
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // A new name from another device replaces the field, unless someone is typing in it.
    if (ref.current && ref.current !== document.activeElement) ref.current.value = name;
  }, [name]);

  const commit = (field: HTMLInputElement) => {
    const typed = field.value.trim();
    if (typed === "") field.value = name;
    else if (typed !== name) rename(typed);
  };

  return (
    <input
      {...props}
      ref={ref}
      defaultValue={name}
      autoComplete="off"
      onBlur={(event) => commit(event.currentTarget)}
      onKeyDown={(event) => {
        if (event.key === "Enter") commit(event.currentTarget);
      }}
      className={fieldClassName}
    />
  );
}
