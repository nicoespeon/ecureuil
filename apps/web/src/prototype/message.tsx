import { type ReactNode, useEffect, useId, useSyncExternalStore } from "react";

/** Throwaway: what an action shows, one at a time, the newest replacing the last. */
type Icon = "ajoute" | "cree" | "retire" | "refuse" | "deja";
type Message = { readonly id: number; readonly text: string; readonly icon: Icon };

let current: Message | null = null;
let nextId = 0;
const listeners = new Set<() => void>();
const emit = () => {
  for (const listener of listeners) listener();
};

export function showMessage(text: string, icon: Icon) {
  nextId += 1;
  current = { id: nextId, text, icon };
  emit();
}

function dismiss(id: number) {
  if (current?.id !== id) return;
  current = null;
  emit();
}

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

const DURATION_MS = 2500;

export function MessageHost() {
  const message = useSyncExternalStore(subscribe, () => current);
  const position = document.documentElement.dataset.position === "b" ? "b" : "a";
  const withIcons = document.documentElement.dataset.icones !== "non";

  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => dismiss(message.id), DURATION_MS);
    return () => clearTimeout(timer);
  }, [message]);

  return (
    <div
      role="status"
      aria-live="polite"
      className={`pointer-events-none fixed inset-x-0 z-[60] flex justify-center px-4 ${
        position === "a"
          ? "bottom-[calc(5.75rem+env(safe-area-inset-bottom))]"
          : "top-[calc(0.5rem+env(safe-area-inset-top))]"
      }`}
    >
      {message && (
        <button
          key={message.id}
          type="button"
          onPointerDown={(event) => event.stopPropagation()}
          onClick={() => dismiss(message.id)}
          className={`message-${position} clay pointer-events-auto flex min-h-14 max-w-md items-center gap-3 rounded-full py-2 pr-6 text-left text-lg font-extrabold ${
            withIcons ? "pl-2" : "pl-6"
          }`}
        >
          {withIcons && <MessageIcon icon={message.icon} />}
          <span>{message.text}</span>
        </button>
      )}
    </div>
  );
}

const iconColors = {
  ajoute: { fill: "#2F8F5B" },
  cree: { fill: "#D4703A" },
  retire: { fill: "#9C6630" },
  refuse: { fill: "#C4483B" },
  deja: { fill: "#D9A23A" },
} satisfies Record<Icon, { fill: string }>;

/** A clay pellet with its mark, like the checked box of the list. */
function MessageIcon({ icon }: { icon: Icon }) {
  const filterId = `clay${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  const { fill } = iconColors[icon];
  return (
    <svg aria-hidden="true" width={40} height={40} viewBox="0 0 48 48" className="shrink-0">
      <defs>
        <filter id={filterId} x="-15%" y="-15%" width="130%" height="130%">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.08"
            numOctaves="1"
            seed="4"
            result="lumps"
          />
          <feDisplacementMap in="SourceGraphic" in2="lumps" scale="2" result="shape" />
          <feGaussianBlur in="SourceAlpha" stdDeviation="1.5" result="blur" />
          <feOffset in="blur" dx="-1.5" dy="-2" result="towardsLight" />
          <feComposite in="SourceAlpha" in2="towardsLight" operator="out" result="darkRim" />
          <feFlood floodColor="#3B1A06" floodOpacity="0.35" />
          <feComposite in2="darkRim" operator="in" result="innerShade" />
          <feOffset in="blur" dx="1.5" dy="2" result="awayFromLight" />
          <feComposite in="SourceAlpha" in2="awayFromLight" operator="out" result="lightRim" />
          <feFlood floodColor="#FFF4E0" floodOpacity="0.45" />
          <feComposite in2="lightRim" operator="in" result="innerLight" />
          <feMerge>
            <feMergeNode in="shape" />
            <feMergeNode in="innerShade" />
            <feMergeNode in="innerLight" />
          </feMerge>
        </filter>
      </defs>
      <ellipse cx="24" cy="43" rx="14" ry="2.5" fill="#000" opacity="0.12" />
      <g filter={`url(#${filterId})`}>
        <circle cx="24" cy="22" r="18" fill={fill} />
      </g>
      <g
        fill="none"
        stroke="white"
        strokeWidth="4.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        filter={`url(#${filterId})`}
      >
        {marks[icon]}
      </g>
    </svg>
  );
}

const marks = {
  ajoute: <path d="M15 22.5 21 28.5 33 16" />,
  cree: <path d="M24 12 V32 M14 22 H34" />,
  retire: <path d="M15 22 H33" />,
  refuse: <path d="M17 15 31 29 M31 15 17 29" />,
  deja: <path d="M16 18 H32 M16 26 H32" />,
} satisfies Record<Icon, ReactNode>;
