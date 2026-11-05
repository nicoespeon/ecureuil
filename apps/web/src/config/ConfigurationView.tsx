import { Tabs } from "@base-ui/react/tabs";
import { Reglages } from "./Reglages";
import { useFocusOnMount } from "./useFocusOnMount";

export function ConfigurationView({ onClose }: { onClose: () => void }) {
  const titleRef = useFocusOnMount<HTMLHeadingElement>();
  return (
    <div className="mx-auto min-h-dvh max-w-5xl bg-white text-neutral-950">
      <header className="sticky top-0 z-20 flex h-14 items-center gap-2 border-b border-neutral-300 bg-white px-2">
        <button type="button" onClick={onClose} className={headerButtonClassName}>
          <span aria-hidden="true">←</span> Liste
        </button>
        <h1 ref={titleRef} tabIndex={-1} className="text-lg font-semibold outline-none">
          Configuration
        </h1>
      </header>
      <Tabs.Root defaultValue="rayons" className="md:flex">
        <Tabs.List
          aria-label="Section"
          className="flex border-b border-neutral-300 md:w-48 md:shrink-0 md:flex-col md:border-r md:border-b-0"
        >
          {sections.map(({ value, label }) => (
            <Tabs.Tab key={value} value={value} className={sectionTabClassName}>
              {label}
            </Tabs.Tab>
          ))}
        </Tabs.List>
        <Tabs.Panel value="rayons" className="min-w-0 flex-1 outline-none" />
        <Tabs.Panel value="items" className="min-w-0 flex-1 outline-none" />
        <Tabs.Panel value="reglages" className="min-w-0 flex-1 outline-none">
          <Reglages />
        </Tabs.Panel>
      </Tabs.Root>
    </div>
  );
}

const sections = [
  { value: "rayons", label: "Rayons" },
  { value: "items", label: "Items" },
  { value: "reglages", label: "Réglages" },
];

const headerButtonClassName =
  "flex h-11 items-center gap-1 rounded-md px-3 text-base font-medium text-neutral-900 hover:bg-neutral-100 focus-visible:outline-2 focus-visible:outline-blue-700";

const sectionTabClassName =
  "h-12 flex-1 border-b-4 border-transparent px-4 text-base font-medium text-neutral-700 outline-none focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-blue-700 data-active:border-neutral-950 data-active:text-neutral-950 md:flex-none md:border-b-0 md:border-l-4 md:text-left";
