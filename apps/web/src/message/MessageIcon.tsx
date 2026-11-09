import { useId } from "react";

/** What a message says happened, drawn as the squirrel's acorn in plasticine. */
export type Icon = "ajoute" | "cree" | "retire" | "refuse" | "deja";

/**
 * Decorative: the message's words carry the meaning. An acorn with a clay sign beside it; a new
 * article is the acorn sprouting instead.
 */
export function MessageIcon({ icon }: { icon: Icon }) {
  // Unique per instance and valid inside `url(#…)`, which React's ids are not.
  const filterId = `clay${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  return (
    <svg aria-hidden="true" width={40} height={40} viewBox="0 0 48 48" className="shrink-0">
      <ClayFilters id={filterId} />
      {icon === "cree" ? (
        <Pousse filterId={filterId} />
      ) : (
        <>
          <ellipse cx="25" cy="44.5" rx="19" ry="2.4" fill="#000" opacity="0.14" />
          <Gland filterId={filterId} at="translate(14.5 3)" />
          <Sign filterId={filterId} {...signs[icon]} />
        </>
      )}
    </svg>
  );
}

/** Adding and removing share the roux: the same gesture, both ways. */
const signs = {
  ajoute: { d: "M25 31 L42 31 M33.5 22.5 L33.5 39.5", color: "#D4703A", underside: "#9A4718" },
  retire: { d: "M25 32 L42 32", color: "#D4703A", underside: "#9A4718" },
  refuse: {
    d: "M26.5 24.5 L40.5 38.5 M40.5 24.5 L26.5 38.5",
    color: "#C2412D",
    underside: "#83261A",
  },
  deja: { d: "M24 32 L29.5 37.5 L41 25", color: "#2F9D6A", underside: "#1D6B47" },
} satisfies Record<Exclude<Icon, "cree">, SignStyle>;

type SignStyle = { d: string; color: string; underside: string };

/** A sausage of clay: a darker underside for its thickness, a shadow on the acorn, a highlight. */
function Sign({ filterId, d, color, underside }: SignStyle & { filterId: string }) {
  const soft = `url(#${filterId}-soft)`;
  return (
    <>
      <SignStroke d={d} stroke="#3B2414" opacity={0.28} shift="1.2 2.8" filter={soft} />
      <g filter={`url(#${filterId})`}>
        <SignStroke d={d} stroke={underside} shift="0.3 1.9" />
        <SignStroke d={d} stroke={color} />
      </g>
      <SignStroke
        d={d}
        stroke="#FFFFFF"
        opacity={0.38}
        width={2.2}
        shift="-0.9 -1.3"
        filter={soft}
      />
    </>
  );
}

function SignStroke({
  d,
  stroke,
  opacity = 1,
  width = 8.2,
  shift = "0 0",
  filter,
}: {
  d: string;
  stroke: string;
  opacity?: number;
  width?: number;
  shift?: string;
  filter?: string;
}) {
  return (
    <path
      d={d}
      fill="none"
      stroke={stroke}
      strokeOpacity={opacity}
      strokeWidth={width}
      strokeLinecap="round"
      strokeLinejoin="round"
      transform={`translate(${shift})`}
      filter={filter}
    />
  );
}

/** The favicon's acorn, at a tenth of its size. */
function Gland({ filterId, at }: { filterId: string; at: string }) {
  const placed = `${at} scale(0.092) translate(-256 -88)`;
  return (
    <>
      <g filter={`url(#${filterId})`}>
        <g transform={placed}>
          <path d="M160 236 C160 332 214 404 256 424 C298 404 352 332 352 236 Z" fill="#C08A45" />
          <ellipse cx="256" cy="424" rx="11" ry="13" fill="#9C6630" />
          <ellipse
            cx="214"
            cy="318"
            rx="20"
            ry="46"
            transform="rotate(-14 214 318)"
            fill="#E2B06C"
          />
          <ellipse cx="256" cy="262" rx="94" ry="22" fill="#9C6630" opacity="0.7" />
        </g>
      </g>
      <g filter={`url(#${filterId})`}>
        <g transform={placed}>
          <path
            d="M252 150 C247 122 256 100 276 88"
            fill="none"
            stroke="#6E4320"
            strokeWidth="30"
            strokeLinecap="round"
          />
          <path
            d="M128 254 C126 184 186 138 256 138 C326 138 386 184 384 254 C362 274 150 274 128 254 Z"
            fill="#6E4320"
          />
          <path
            d="M168 190 C196 160 232 152 262 152"
            fill="none"
            stroke="#8A5A2E"
            strokeWidth="18"
            strokeLinecap="round"
          />
        </g>
      </g>
    </>
  );
}

/** The acorn, lower and centred, with two leaves and two sparkles: a new article. */
function Pousse({ filterId }: { filterId: string }) {
  return (
    <>
      <ellipse cx="24" cy="44.5" rx="15" ry="2.4" fill="#000" opacity="0.14" />
      <Gland filterId={filterId} at="translate(23 17.15)" />
      <g filter={`url(#${filterId})`}>
        <path
          d="M24 14.5 C23.5 10 24.5 7 27 4.5"
          fill="none"
          stroke="#3E7A36"
          strokeWidth="2.6"
          strokeLinecap="round"
        />
        <path d="M26.5 5.5 C30 1.5 36.5 2 38.5 4.5 C35.5 8.5 29.5 9 26.5 5.5 Z" fill="#5FA548" />
        <path d="M24.5 9 C21 5 15 5.5 13 8.5 C16.5 12 22 12 24.5 9 Z" fill="#4C9140" />
      </g>
      <g filter={`url(#${filterId})`} fill="#F2C14E">
        <path d="M39 11 Q39.9 15.1 44 16 Q39.9 16.9 39 21 Q38.1 16.9 34 16 Q38.1 15.1 39 11 Z" />
        <path d="M9 17.8 Q9.576 20.424 12.2 21 Q9.576 21.576 9 24.2 Q8.424 21.576 5.8 21 Q8.424 20.424 9 17.8 Z" />
      </g>
    </>
  );
}

/** The mascot's plasticine (`Ecureuil.tsx`), tuned for 48 units, and a blur for soft shadows. */
function ClayFilters({ id }: { id: string }) {
  return (
    <defs>
      <filter
        id={id}
        filterUnits="userSpaceOnUse"
        x="0"
        y="0"
        width="48"
        height="48"
        colorInterpolationFilters="sRGB"
      >
        <feTurbulence
          type="fractalNoise"
          baseFrequency="0.09"
          numOctaves="1"
          seed="4"
          result="lumps"
        />
        <feDisplacementMap in="SourceGraphic" in2="lumps" scale="1.3" result="shape" />
        <feGaussianBlur in="SourceAlpha" stdDeviation="1.5" result="blur" />
        <feOffset in="blur" dx="-1.2" dy="-1.6" result="towardsLight" />
        <feComposite in="SourceAlpha" in2="towardsLight" operator="out" result="darkRim" />
        <feFlood floodColor="#5A2A0C" floodOpacity="0.5" />
        <feComposite in2="darkRim" operator="in" result="innerShade" />
        <feOffset in="blur" dx="1.2" dy="1.6" result="awayFromLight" />
        <feComposite in="SourceAlpha" in2="awayFromLight" operator="out" result="lightRim" />
        <feFlood floodColor="#FFF4E0" floodOpacity="0.55" />
        <feComposite in2="lightRim" operator="in" result="innerLight" />
        <feTurbulence
          type="fractalNoise"
          baseFrequency="0.9"
          numOctaves="2"
          seed="9"
          result="grain"
        />
        <feColorMatrix
          in="grain"
          type="matrix"
          values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.22 0"
          result="grainAlpha"
        />
        <feComposite in="grainAlpha" in2="shape" operator="in" result="grainInShape" />
        <feMerge>
          <feMergeNode in="shape" />
          <feMergeNode in="innerShade" />
          <feMergeNode in="innerLight" />
          <feMergeNode in="grainInShape" />
        </feMerge>
      </filter>
      <filter id={`${id}-soft`} filterUnits="userSpaceOnUse" x="0" y="0" width="48" height="48">
        <feGaussianBlur stdDeviation="0.7" />
      </filter>
    </defs>
  );
}
