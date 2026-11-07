import { Ecureuil } from "../liste/Ecureuil";
import type { AmbianceProps } from "./Ambiances";
import { CartIcon, CheckIcon, GearIcon, HomeIcon } from "./icons";
import { demande, magasins, panier, rayons } from "./maquette";

const ink = "text-[#3B2414]";

/** A: everything you touch is a lump of clay on a cream table; the list stays calm. */
export function AmbianceA({ tint, active, select }: AmbianceProps) {
  return (
    <div data-tint={tint} className={`font-clay min-h-dvh bg-[#FBF3E6] pb-28 ${ink}`}>
      <header className="clay-raised sticky top-0 z-10 flex items-center gap-2 rounded-b-[28px] bg-(--t-100) p-3">
        <div className="flex min-w-0 gap-1 overflow-x-auto">
          {magasins.map((name, index) => (
            <button
              key={name}
              type="button"
              onClick={() => select(index)}
              className={`h-11 shrink-0 rounded-full px-4 text-lg ${index === active ? "clay-raised bg-white font-black text-(--t-900)" : "font-bold text-(--t-900)"}`}
            >
              {name}
            </button>
          ))}
        </div>
        <div className="ml-auto flex shrink-0 items-center gap-2">
          <span className="clay-well flex h-11 w-[88px] items-center justify-between rounded-full bg-(--t-700) p-1 text-white">
            <span className="grid size-9 place-items-center">
              <HomeIcon size={20} strokeWidth={2.5} />
            </span>
            <span className="clay-raised grid size-9 place-items-center rounded-full bg-white text-(--t-800)">
              <CartIcon size={20} strokeWidth={2.5} />
            </span>
          </span>
          <span className="clay-raised grid size-11 place-items-center rounded-full bg-white text-(--t-900)">
            <GearIcon size={22} strokeWidth={2.5} />
          </span>
        </div>
      </header>
      <AValider />
      {rayons.map((rayon) => (
        <section key={rayon.name}>
          <h2 className="px-5 pt-5 pb-2 text-sm font-black tracking-wide text-[#8A5A3B] uppercase">
            {rayon.name}
          </h2>
          <ul className="clay-raised mx-3 overflow-hidden rounded-3xl bg-white">
            {rayon.articles.map((article) => (
              <Row key={article.name} article={article} checked={false} />
            ))}
          </ul>
        </section>
      ))}
      <Panier />
      <div className="fixed inset-x-0 bottom-0 bg-[#FBF3E6]/95 p-3 pb-4">
        <button
          type="button"
          className="clay-button h-14 w-full rounded-full bg-[#B4561F] text-lg font-black text-white"
        >
          Terminer les courses
        </button>
      </div>
    </div>
  );
}

function AValider() {
  return (
    <section className="clay-raised mx-3 mt-4 rounded-3xl bg-white p-3">
      <h2 className="flex items-center gap-2 px-1 text-sm font-black tracking-wide text-[#8A5A3B] uppercase">
        À valider
        <span className="grid size-6 place-items-center rounded-full bg-[#B4561F] text-xs text-white">
          1
        </span>
      </h2>
      <div className="mt-2 flex items-center gap-2">
        <span className="flex-1 pl-1 text-lg font-bold">{demande}</span>
        <button
          type="button"
          className="clay-button h-11 rounded-full bg-[#B4561F] px-4 font-black text-white"
        >
          Accepter
        </button>
        <button type="button" className="clay-raised h-11 rounded-full bg-[#F6EBDD] px-4 font-bold">
          Refuser
        </button>
      </div>
    </section>
  );
}

function Panier() {
  return (
    <section>
      <h2 className="flex items-end gap-2 px-4 pt-6 pb-1 text-sm font-black tracking-wide text-emerald-800 uppercase">
        <Ecureuil size={52} />
        <span className="pb-2">Dans le panier · {panier.length}</span>
      </h2>
      <ul className="clay-raised mx-3 overflow-hidden rounded-3xl bg-emerald-50">
        {panier.map((article) => (
          <Row key={article.name} article={article} checked />
        ))}
      </ul>
    </section>
  );
}

function Row({
  article,
  checked,
}: {
  article: { name: string; quantity: number };
  checked: boolean;
}) {
  return (
    <li className="flex min-h-16 items-center gap-3 border-b-2 border-[#FBF3E6] px-3 last:border-b-0">
      <span
        className={`grid size-10 shrink-0 place-items-center rounded-full ${checked ? "clay-raised bg-emerald-600 text-white" : "clay-well bg-[#F6EBDD]"}`}
      >
        {checked && <CheckIcon size={24} strokeWidth={3.5} />}
      </span>
      <span className={`text-lg font-bold ${checked ? "text-[#3B2414]/75" : ""}`}>
        {article.name}
      </span>
      {article.quantity > 1 && (
        <span className="rounded-full bg-(--t-100) px-2 py-0.5 text-sm font-black text-(--t-900)">
          ×{article.quantity}
        </span>
      )}
    </li>
  );
}
