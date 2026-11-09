/**
 * Throwaway, until Nicolas picks: where the checked box flies, chosen by `?variante=a|b` and
 * remembered on the device. A: the panier's heading. B: the cart of the header.
 */
export function flightTarget() {
  return variante() === "b" ? "chariot" : "panier";
}

const KEY = "prototype.variante";

function variante() {
  const asked = new URLSearchParams(location.search).get("variante");
  try {
    if (asked === "a" || asked === "b") localStorage.setItem(KEY, asked);
    return asked ?? localStorage.getItem(KEY);
  } catch {
    return asked;
  }
}
