import { useId } from "react";

const brun = "#3B2414";
const roux = "#D4703A";
const rouxFonce = "#B4561F";
const creme = "#F6DDB5";

/**
 * The mascot, seated in profile with an acorn, in plasticine: lumpy edges, a fine grain, shading
 * inside the silhouette and a matte shadow. Decorative: the text next to it says the moment.
 */
export function Ecureuil({ size }: { size: number }) {
  // Unique per instance and valid inside `url(#…)`, which React's ids are not.
  const filterId = `clay${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  return (
    <svg aria-hidden="true" width={size} height={size} viewBox="0 0 120 120">
      <defs>
        <filter id={filterId} x="-10%" y="-10%" width="120%" height="120%">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.035"
            numOctaves="1"
            seed="4"
            result="lumps"
          />
          <feDisplacementMap in="SourceGraphic" in2="lumps" scale="3" result="shape" />
          <feGaussianBlur in="SourceAlpha" stdDeviation="3" result="blur" />
          <feOffset in="blur" dx="-3" dy="-4" result="towardsLight" />
          <feComposite in="SourceAlpha" in2="towardsLight" operator="out" result="darkRim" />
          <feFlood floodColor="#5A2A0C" floodOpacity="0.45" />
          <feComposite in2="darkRim" operator="in" result="innerShade" />
          <feOffset in="blur" dx="3" dy="4" result="awayFromLight" />
          <feComposite in="SourceAlpha" in2="awayFromLight" operator="out" result="lightRim" />
          <feFlood floodColor="#FFF4E0" floodOpacity="0.45" />
          <feComposite in2="lightRim" operator="in" result="innerLight" />
          <feTurbulence
            type="fractalNoise"
            baseFrequency="1.2"
            numOctaves="2"
            seed="9"
            result="grain"
          />
          <feColorMatrix
            in="grain"
            type="matrix"
            values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.3 0"
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
      </defs>
      <ellipse cx="62" cy="109" rx="44" ry="6" fill="#000" opacity="0.14" />
      <g filter={`url(#${filterId})`}>
        <path
          d="M52 104 C18 104 6 74 16 52 C24 34 14 20 28 12 C44 4 60 18 52 34 C46 46 58 58 62 72 C66 88 64 104 52 104 Z"
          fill={roux}
        />
        <path
          d="M48 96 C26 94 18 74 24 58 C30 44 24 30 32 22 C26 34 34 46 40 58 C46 72 52 86 48 96 Z"
          fill={rouxFonce}
        />
        <ellipse cx="70" cy="82" rx="20" ry="24" fill={roux} />
        <ellipse cx="76" cy="86" rx="11" ry="16" fill={creme} />
        <path
          d="M70 38 L72 20 L82 34 Z"
          fill={roux}
          strokeLinejoin="round"
          stroke={roux}
          strokeWidth="4"
        />
        <path d="M73 33 L73.5 26 L78 32 Z" fill={creme} />
        <circle cx="80" cy="50" r="17" fill={roux} />
        <ellipse cx="94" cy="57" rx="9" ry="7" fill={creme} />
        <circle cx="101" cy="54" r="3" fill={brun} />
        <circle cx="86" cy="46" r="3.4" fill={brun} />
        <ellipse cx="91" cy="78" rx="6.5" ry="8" fill="#C08A45" />
        <path
          d="M83 75 Q91 64 99 75 Z"
          fill="#6E4320"
          stroke="#6E4320"
          strokeWidth="2"
          strokeLinejoin="round"
        />
        <ellipse cx="84" cy="82" rx="4.5" ry="3.5" fill={rouxFonce} />
        <ellipse cx="64" cy="105" rx="10" ry="4.5" fill={rouxFonce} />
        <ellipse cx="82" cy="105" rx="8" ry="4.5" fill={rouxFonce} />
      </g>
      <circle cx="87" cy="45" r="1" fill="white" />
    </svg>
  );
}
