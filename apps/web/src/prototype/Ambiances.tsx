import { useState } from "react";
import { AmbianceA } from "./AmbianceA";
import { AmbianceB } from "./AmbianceB";
import { AmbianceC } from "./AmbianceC";
import { type Tint, tints } from "./maquette";
import "./prototype.css";

const ambiances = {
  a: { label: "A · Atelier pâte à modeler", Component: AmbianceA },
  b: { label: "B · Carnet d'épicerie", Component: AmbianceB },
  c: { label: "C · Pop coloré", Component: AmbianceC },
} as const;

type AmbianceKey = keyof typeof ambiances;

export type AmbianceProps = {
  tint: Tint;
  active: number;
  select: (index: number) => void;
};

/** Throwaway: `?ambiance=a|b|c`, a switcher on top unless `&capture`. */
export function Ambiances({ params }: { params: URLSearchParams }) {
  const [key, setKey] = useState(toKey(params.get("ambiance")));
  const [active, setActive] = useState(0);
  const { Component } = ambiances[key];
  return (
    <>
      {!params.has("capture") && <Switcher current={key} choose={setKey} />}
      <Component tint={tints[active] ?? "indigo"} active={active} select={setActive} />
    </>
  );
}

function Switcher({
  current,
  choose,
}: {
  current: AmbianceKey;
  choose: (key: AmbianceKey) => void;
}) {
  return (
    <nav
      aria-label="Ambiance"
      className="flex gap-1 bg-neutral-900 p-1 font-sans text-sm text-white"
    >
      {keys.map((key) => (
        <button
          key={key}
          type="button"
          aria-pressed={key === current}
          onClick={() => {
            choose(key);
            history.replaceState(null, "", `?ambiance=${key}`);
          }}
          className="min-h-11 flex-1 rounded-md px-2 aria-pressed:bg-white aria-pressed:text-neutral-900"
        >
          {ambiances[key].label}
        </button>
      ))}
    </nav>
  );
}

const keys = ["a", "b", "c"] as const;

function toKey(value: string | null): AmbianceKey {
  return keys.find((key) => key === value) ?? "a";
}
