import { Ecureuil } from "../liste/Ecureuil";
import type { AmbianceProps } from "./Ambiances";
import { CartIcon, CheckIcon, GearIcon, HomeIcon } from "./icons";
import { demande, magasins, panier, rayons } from "./maquette";

/** B: a notebook page in ink, the magasin as a divider tab; the squirrel alone is clay. */
export function AmbianceB({ tint, active, select }: AmbianceProps) {
  return (
    <div data-tint={tint} className="min-h-dvh bg-[#FBF8F1] pb-28 text-[#1F2A44]">
      <Header active={active} select={select} />
      <AValider />
      {rayons.map((rayon) => (
        <section key={rayon.name} className="px-4">
          <h2 className="font-carnet flex items-baseline gap-3 pt-6 text-xl text-(--t-800) italic">
            {rayon.name}
            <span className="h-px flex-1 bg-(--t-300)" />
          </h2>
          <ul>
            {rayon.articles.map((article) => (
              <Row key={article.name} article={article} checked={false} />
            ))}
          </ul>
        </section>
      ))}
      <section className="px-4">
        <h2 className="font-carnet flex items-center gap-2 pt-6 text-xl text-emerald-800 italic">
          <Ecureuil size={44} />
          Dans le panier
          <span className="h-px flex-1 bg-emerald-300" />
        </h2>
        <ul>
          {panier.map((article) => (
            <Row key={article.name} article={article} checked />
          ))}
        </ul>
      </section>
      <div className="fixed inset-x-0 bottom-0 border-t border-[#D9D2C3] bg-[#FBF8F1] p-3 pb-4">
        <button
          type="button"
          className="font-carnet h-14 w-full rounded-md bg-[#1F2A44] text-xl font-bold text-[#FBF8F1]"
        >
          Terminer les courses
        </button>
      </div>
    </div>
  );
}

function Header({ active, select }: Pick<AmbianceProps, "active" | "select">) {
  return (
    <header className="sticky top-0 z-10 flex items-end gap-2 border-b-2 border-(--t-700) bg-[#FBF8F1] px-3 pt-3">
      <div className="flex min-w-0 gap-1 overflow-x-auto">
        {magasins.map((name, index) => (
          <button
            key={name}
            type="button"
            onClick={() => select(index)}
            className={`font-carnet -mb-0.5 h-12 shrink-0 rounded-t-lg px-4 text-lg ${index === active ? "border-2 border-b-0 border-(--t-700) bg-(--t-100) font-bold" : "text-[#1F2A44]/75"}`}
          >
            {name}
          </button>
        ))}
      </div>
      <div className="mb-1.5 ml-auto flex shrink-0 items-center gap-1">
        <span className="flex h-10 items-center rounded-md border-2 border-[#1F2A44]">
          <span className="grid h-full w-10 place-items-center">
            <HomeIcon size={18} strokeWidth={1.75} />
          </span>
          <span className="grid h-full w-10 place-items-center bg-[#1F2A44] text-[#FBF8F1]">
            <CartIcon size={18} strokeWidth={1.75} />
          </span>
        </span>
        <span className="grid size-11 place-items-center">
          <GearIcon size={22} strokeWidth={1.75} />
        </span>
      </div>
    </header>
  );
}

function AValider() {
  return (
    <section className="mx-4 mt-5 -rotate-1 bg-[#FFF3B0] p-3 shadow-[0_6px_10px_-6px_rgb(0_0_0/0.35)]">
      <h2 className="font-carnet text-lg italic">À valider (1)</h2>
      <div className="mt-1 flex items-center gap-2">
        <span className="flex-1 text-lg">{demande}</span>
        <button
          type="button"
          className="h-11 rounded-md bg-[#1F2A44] px-3 font-semibold text-[#FFF3B0]"
        >
          Accepter
        </button>
        <button
          type="button"
          className="h-11 rounded-md border-2 border-[#1F2A44] px-3 font-semibold"
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
    <li className="flex min-h-14 items-center gap-3 border-b border-dashed border-[#C9C1B0]">
      <span
        className={`grid size-7 shrink-0 -rotate-2 place-items-center rounded-[4px] border-2 ${checked ? "border-emerald-800 text-emerald-800" : "border-[#1F2A44]"}`}
      >
        {checked && <CheckIcon size={22} strokeWidth={2.5} />}
      </span>
      <span
        className={`text-lg ${checked ? "text-[#1F2A44]/70 line-through decoration-emerald-800/60" : ""}`}
      >
        {article.name}
      </span>
      {article.quantity > 1 && (
        <span className="font-carnet text-lg text-(--t-800) italic">× {article.quantity}</span>
      )}
    </li>
  );
}
