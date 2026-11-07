/** Static data for the throwaway ambiance mock-ups: the Costco list, halfway through a sortie. */
export const magasins = ["Costco", "Maxi", "Pharmaprix"] as const;

export const tints = ["indigo", "amber", "cyan"] as const;

export type Tint = (typeof tints)[number];

export const demande = "Chocolat chaud";

export const rayons = [
  { name: "Fruits et légumes", articles: [{ name: "Champignons", quantity: 1 }] },
  {
    name: "Produits laitiers",
    articles: [
      { name: "Lait", quantity: 3 },
      { name: "Yaourts", quantity: 1 },
    ],
  },
  { name: "Épicerie", articles: [{ name: "Nutella", quantity: 1 }] },
] as const;

export const panier = [
  { name: "Babybel", quantity: 1 },
  { name: "Pretzel Crisps", quantity: 2 },
  { name: "Shampooing", quantity: 1 },
] as const;
