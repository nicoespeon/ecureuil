import type { ReactNode } from "react";

/** A full screen before the list: a new device, a lien to check or to replace. */
export function Accueil({ title, children }: { title: string; children: ReactNode }) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-xl flex-col justify-center gap-4 bg-white px-6 text-neutral-950">
      <h1 className="text-3xl font-semibold">{title}</h1>
      {children}
    </main>
  );
}

export const buttonClassName =
  "h-12 rounded-md bg-neutral-900 px-4 text-base font-semibold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700";
