import { Ecureuil } from "../liste/Ecureuil";
import type { AmbianceProps } from "./Ambiances";
import { CartIcon, CheckIcon, GearIcon, HomeIcon } from "./icons";
import { demande, magasins, panier, rayons } from "./maquette";

/** C: the magasin's hue everywhere, thick outlines, hard black shadows. */
export function AmbianceC({ tint, active, select }: AmbianceProps) {
  return (
    <div data-tint={tint} className="font-pop min-h-dvh bg-(--t-50) pb-28 text-[#111]">
      <Header active={active} select={select} />
      <AValider />
      {rayons.map((rayon) => (
        <section key={rayon.name} className="px-3 pt-5">
          <h2 className="mb-2 inline-block rounded-full bg-[#111] px-3 py-1 text-sm font-extrabold tracking-wide text-white uppercase">
            {rayon.name}
          </h2>
          <ul className="pop-shadow overflow-hidden rounded-2xl border-2 border-[#111] bg-white">
            {rayon.articles.map((article) => (
              <Row key={article.name} article={article} checked={false} />
            ))}
          </ul>
        </section>
      ))}
      <section className="px-3 pt-6">
        <h2 className="mb-2 flex items-end gap-2 text-sm font-extrabold tracking-wide uppercase">
          <Ecureuil size={64} />
          <span className="mb-2 rounded-full bg-emerald-300 px-3 py-1">Dans le panier</span>
        </h2>
        <ul className="pop-shadow overflow-hidden rounded-2xl border-2 border-[#111] bg-emerald-100">
          {panier.map((article) => (
            <Row key={article.name} article={article} checked />
          ))}
        </ul>
      </section>
      <div className="fixed inset-x-0 bottom-0 bg-(--t-50) p-3 pb-4">
        <button
          type="button"
          className="pop-shadow h-14 w-full rounded-2xl border-2 border-[#111] bg-(--t-300) text-lg font-extrabold"
        >
          Terminer les courses
        </button>
      </div>
    </div>
  );
}

function Header({ active, select }: Pick<AmbianceProps, "active" | "select">) {
  return (
    <header className="sticky top-0 z-10 flex items-center gap-2 border-b-2 border-[#111] bg-(--t-700) p-2 text-white">
      <div className="flex min-w-0 gap-1 overflow-x-auto p-1">
        {magasins.map((name, index) => (
          <button
            key={name}
            type="button"
            onClick={() => select(index)}
            className={`h-11 shrink-0 rounded-full px-4 text-lg font-extrabold ${index === active ? "pop-shadow border-2 border-[#111] bg-white text-[#111]" : ""}`}
          >
            {name}
          </button>
        ))}
      </div>
      <div className="ml-auto flex shrink-0 items-center gap-2">
        <span className="flex h-11 w-[88px] items-center justify-between rounded-full border-2 border-[#111] bg-[#111] p-1">
          <span className="grid size-8 place-items-center">
            <HomeIcon size={20} strokeWidth={2.5} />
          </span>
          <span className="grid size-8 place-items-center rounded-full bg-(--t-300) text-[#111]">
            <CartIcon size={20} strokeWidth={2.5} />
          </span>
        </span>
        <span className="grid size-11 place-items-center">
          <GearIcon size={24} strokeWidth={2.5} />
        </span>
      </div>
    </header>
  );
}

function AValider() {
  return (
    <section className="pop-shadow mx-3 mt-4 rounded-2xl border-2 border-[#111] bg-[#FFE45C] p-3">
      <h2 className="text-sm font-extrabold tracking-wide uppercase">À valider · 1</h2>
      <div className="mt-2 flex items-center gap-2">
        <span className="flex-1 text-lg font-bold">{demande}</span>
        <button
          type="button"
          className="pop-shadow h-11 rounded-full border-2 border-[#111] bg-[#111] px-4 font-extrabold text-white"
        >
          Accepter
        </button>
        <button
          type="button"
          className="pop-shadow h-11 rounded-full border-2 border-[#111] bg-white px-4 font-extrabold"
        >
          Refuser
        </button>
      </div>
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
    <li className="flex min-h-16 items-center gap-3 border-b-2 border-[#111]/10 px-3 last:border-b-0">
      <span
        className={`grid size-10 shrink-0 place-items-center rounded-xl border-[3px] border-[#111] ${checked ? "bg-emerald-400" : "bg-white"}`}
      >
        {checked && <CheckIcon size={24} strokeWidth={3.5} />}
      </span>
      <span className="text-lg font-bold">{article.name}</span>
      {article.quantity > 1 && (
        <span className="rounded-full border-2 border-[#111] bg-(--t-200) px-2 text-sm font-extrabold">
          ×{article.quantity}
        </span>
      )}
    </li>
  );
}
