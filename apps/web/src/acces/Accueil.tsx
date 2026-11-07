import type { ReactNode } from "react";
import { useFocusOnMount } from "../config/useFocusOnMount";
import { Ecureuil } from "../liste/Ecureuil";

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
    <main className="mx-auto flex min-h-dvh max-w-xl flex-col justify-center gap-4 px-6">
      <Ecureuil size={112} />
      <h1 ref={titleRef} tabIndex={-1} className="text-4xl font-black outline-none">
        {title}
      </h1>
      {children}
    </main>
  );
}

export const buttonClassName =
  "button-primary text-base focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700";

export const secondaryButtonClassName =
  "button-secondary text-base focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 disabled:opacity-50";

export const inputClassName =
  "clay-well h-12 rounded-full bg-white px-4 text-base font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700";
