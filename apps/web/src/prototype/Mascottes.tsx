import { type ReactNode, useState } from "react";

/** Throwaway: four squirrels side by side, to pick one on the phone. Never merged. */
export function Mascottes() {
  const [hopKey, setHopKey] = useState(0);
  return (
    <main className="mx-auto max-w-xl bg-white p-4 text-neutral-950">
      <h1 className="text-2xl font-semibold">Mascotte : quatre écureuils</h1>
      <p className="mt-1 text-neutral-700">
        Chaque variante à 40, 72 et 120 px, puis dans l'encart « Tout est dans le panier ».
      </p>
      <button
        type="button"
        onClick={() => setHopKey((key) => key + 1)}
        className="mt-3 h-11 rounded-md bg-neutral-900 px-4 font-semibold text-white"
      >
        Faire bondir
      </button>
      {variantes.map(({ lettre, nom, Ecureuil }) => (
        <section key={lettre} className="mt-6 border-t border-neutral-300 pt-4">
          <h2 className="text-lg font-semibold">
            {lettre}. {nom}
          </h2>
          <div className="mt-2 flex items-end gap-4">
            {[40, 72, 120].map((size) => (
              <Ecureuil key={size} size={size} />
            ))}
          </div>
          <Encart>
            <span key={hopKey} className="hop inline-block">
              <Ecureuil size={64} />
            </span>
          </Encart>
        </section>
      ))}
    </main>
  );
}

function Encart({ children }: { children: ReactNode }) {
  return (
    <div className="mt-3 flex items-center gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3">
      {children}
      <div>
        <p className="font-semibold text-emerald-900">Tout est dans le panier !</p>
        <p className="text-sm text-emerald-900">Plus qu'à terminer les courses.</p>
      </div>
    </div>
  );
}

const roux = "#C8682B";
const rouxFonce = "#9A4A1C";
const creme = "#F7E2C0";
const brun = "#3B2414";
const gland = "#B9833F";
const chapeau = "#6E4320";

function Svg({ size, children }: { size: number; children: ReactNode }) {
  return (
    <svg aria-hidden="true" width={size} height={size} viewBox="0 0 120 120">
      {children}
    </svg>
  );
}

/** Seated, in profile, the tail in an S, an acorn between its paws. */
function Profil({ size }: { size: number }) {
  return (
    <Svg size={size}>
      <path
        d="M52 104 C18 104 6 74 16 52 C24 34 14 20 28 12 C44 4 60 18 52 34 C46 46 58 58 62 72 C66 88 64 104 52 104 Z"
        fill={roux}
      />
      <path
        d="M48 96 C26 94 18 74 24 58 C30 44 24 30 32 22 C26 34 34 46 40 58 C46 72 52 86 48 96 Z"
        fill={rouxFonce}
        opacity="0.35"
      />
      <ellipse cx="70" cy="82" rx="20" ry="24" fill={roux} />
      <ellipse cx="76" cy="86" rx="11" ry="16" fill={creme} />
      <path d="M70 38 L72 20 L82 34 Z" fill={roux} />
      <path d="M72.5 34 L73.5 25 L78.5 33 Z" fill={creme} />
      <circle cx="80" cy="50" r="17" fill={roux} />
      <ellipse cx="94" cy="57" rx="9" ry="7" fill={creme} />
      <circle cx="101" cy="54" r="2.6" fill={brun} />
      <circle cx="86" cy="46" r="3" fill={brun} />
      <circle cx="87" cy="45" r="1" fill="white" />
      <ellipse cx="91" cy="78" rx="6" ry="7.5" fill={gland} />
      <path d="M84 74 Q91 66 98 74 Z" fill={chapeau} />
      <ellipse cx="84" cy="82" rx="4" ry="3" fill={rouxFonce} />
      <ellipse cx="64" cy="105" rx="10" ry="4" fill={rouxFonce} />
      <ellipse cx="82" cy="105" rx="8" ry="4" fill={rouxFonce} />
    </Svg>
  );
}

/** Round face, front on, like a badge: the tail peeks out behind. */
function Frimousse({ size }: { size: number }) {
  return (
    <Svg size={size}>
      <path
        d="M78 96 C108 98 116 70 106 52 C98 38 108 24 96 16 C84 10 74 22 82 36 C88 48 80 66 78 96 Z"
        fill={rouxFonce}
      />
      <path d="M30 40 L28 14 L48 32 Z" fill={roux} />
      <path d="M90 40 L92 14 L72 32 Z" fill={roux} />
      <path d="M33 34 L32 21 L42 31 Z" fill={creme} />
      <path d="M87 34 L88 21 L78 31 Z" fill={creme} />
      <ellipse cx="60" cy="64" rx="36" ry="34" fill={roux} />
      <ellipse cx="60" cy="76" rx="22" ry="18" fill={creme} />
      <circle cx="46" cy="58" r="4.5" fill={brun} />
      <circle cx="74" cy="58" r="4.5" fill={brun} />
      <circle cx="47.5" cy="56.5" r="1.5" fill="white" />
      <circle cx="75.5" cy="56.5" r="1.5" fill="white" />
      <ellipse cx="60" cy="69" rx="4" ry="3" fill={brun} />
      <path
        d="M56 76 Q60 80 64 76"
        fill="none"
        stroke={brun}
        strokeWidth="2"
        strokeLinecap="round"
      />
      <rect x="57" y="78" width="6" height="5" rx="1" fill="white" />
      <circle cx="38" cy="72" r="5" fill="#E9967A" opacity="0.6" />
      <circle cx="82" cy="72" r="5" fill="#E9967A" opacity="0.6" />
    </Svg>
  );
}

/** The profile one, with a little shopping bag instead of the acorn. */
function Cabas({ size }: { size: number }) {
  return (
    <Svg size={size}>
      <path
        d="M52 104 C18 104 6 74 16 52 C24 34 14 20 28 12 C44 4 60 18 52 34 C46 46 58 58 62 72 C66 88 64 104 52 104 Z"
        fill={roux}
      />
      <ellipse cx="70" cy="82" rx="20" ry="24" fill={roux} />
      <ellipse cx="76" cy="86" rx="11" ry="16" fill={creme} />
      <path d="M70 38 L72 20 L82 34 Z" fill={roux} />
      <circle cx="80" cy="50" r="17" fill={roux} />
      <ellipse cx="94" cy="57" rx="9" ry="7" fill={creme} />
      <circle cx="101" cy="54" r="2.6" fill={brun} />
      <circle cx="86" cy="46" r="3" fill={brun} />
      <circle cx="87" cy="45" r="1" fill="white" />
      <path d="M86 76 Q94 62 102 76" fill="none" stroke={brun} strokeWidth="2.5" />
      <path d="M82 76 H106 L102 98 H86 Z" fill="#2F855A" />
      <circle cx="90" cy="74" r="3.5" fill={gland} />
      <circle cx="97" cy="73" r="3" fill="#E53E3E" />
      <ellipse cx="84" cy="82" rx="4" ry="3" fill={rouxFonce} />
      <ellipse cx="64" cy="105" rx="10" ry="4" fill={rouxFonce} />
      <ellipse cx="80" cy="105" rx="8" ry="4" fill={rouxFonce} />
    </Svg>
  );
}

/** The profile one, as a line, like the app's icons. */
function Trait({ size }: { size: number }) {
  return (
    <svg
      aria-hidden="true"
      width={size}
      height={size}
      viewBox="0 0 120 120"
      fill="none"
      stroke="currentColor"
      strokeWidth="5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="text-neutral-900"
    >
      <path d="M52 104 C18 104 6 74 16 52 C24 34 14 20 28 12 C44 4 60 18 52 34 C46 46 58 58 62 72" />
      <path d="M58 64 C50 76 50 98 64 104 H86 C92 96 92 84 86 74" />
      <path d="M70 36 L72 20 L82 34" />
      <path d="M66 52 C64 38 76 30 88 34 C96 38 104 46 102 56 C100 62 92 64 86 62" />
      <circle cx="86" cy="46" r="1.5" fill="currentColor" />
      <path d="M86 76 C90 70 96 70 98 76 C98 84 92 88 88 84" />
    </svg>
  );
}

const variantes = [
  { lettre: "A", nom: "De profil, gland entre les pattes", Ecureuil: Profil },
  { lettre: "B", nom: "Frimousse de face", Ecureuil: Frimousse },
  { lettre: "C", nom: "De profil, avec un cabas", Ecureuil: Cabas },
  { lettre: "D", nom: "Au trait, comme les icônes", Ecureuil: Trait },
];
