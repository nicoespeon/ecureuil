import type { ReactNode } from "react";
import { useFocusOnMount } from "../config/useFocusOnMount";

/** A full screen before the list: a new device, a lien to check or to replace. */
export function Accueil({
  title,
  focusTitle = false,
  children,
}: {
  title: string;
  /** When the screen replaces the one that had the focus. */
  focusTitle?: boolean;
  children: ReactNode;
}) {
  const titleRef = useFocusOnMount<HTMLHeadingElement>(focusTitle);
  return (
    <main className="mx-auto flex min-h-dvh max-w-xl flex-col justify-center gap-4 bg-white px-6 text-neutral-950">
      <h1 ref={titleRef} tabIndex={-1} className="text-3xl font-semibold outline-none">
        {title}
      </h1>
      {children}
    </main>
  );
}

export const buttonClassName =
  "h-12 rounded-md bg-neutral-900 px-4 text-base font-semibold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700";

export const secondaryButtonClassName =
  "h-12 rounded-md border border-neutral-400 px-4 text-base font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 disabled:opacity-50";

export const inputClassName =
  "h-12 rounded-md border border-neutral-400 px-3 text-base focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700";
