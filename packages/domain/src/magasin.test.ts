import { Event } from "@ecureuil/wire";
import { Schema } from "effect";
import { expect, it } from "vitest";
import { magasinCreation } from "./magasin";
import { fold } from "./reducer";

const decode = Schema.decodeUnknownSync(Event);

it("un nouveau magasin démarre avec les rayons par défaut, dans cet ordre", () => {
  const ids = ["iga", "r1", "r2", "r3", "r4", "r5", "r6", "r7", "r8"].values();
  const { magasinId, drafts } = magasinCreation({
    name: "IGA",
    newId: () => ids.next().value ?? "",
  });

  const events = drafts.map((draft, index) =>
    decode({ id: `e${index}`, at: index, actor: "proprietaire", device: "pixel", ...draft }),
  );

  expect(fold(events).magasins[magasinId]).toEqual({
    id: "iga",
    name: "IGA",
    rayons: [
      { id: "r1", name: "Fruits et légumes" },
      { id: "r2", name: "Boulangerie" },
      { id: "r3", name: "Viandes et poissons" },
      { id: "r4", name: "Produits laitiers" },
      { id: "r5", name: "Épicerie" },
      { id: "r6", name: "Surgelés" },
      { id: "r7", name: "Hygiène" },
      { id: "r8", name: "Entretien" },
    ],
  });
});
