import { type Actor, inviteLienPath, lienPath } from "@ecureuil/wire";

export const API_URL = "https://api.ecureuil.test";

/** `/lien` and `/lien/invite` as `@ecureuil/wire` describes them, in memory. */
export function fakeLienApi(secrets: Record<Actor, string>) {
  const liens = { ...secrets };
  let regenerated = 0;

  const routes: Record<string, (role: Actor) => Response> = {
    [`GET ${lienPath}`]: (role) => Response.json({ role }),
    [`POST ${inviteLienPath}`]: (role) => {
      if (role !== "proprietaire") return new Response(null, { status: 403 });
      regenerated += 1;
      liens.invite = `secret-invite-${regenerated}`;
      return Response.json({ secret: liens.invite });
    },
  };

  return async (input: string, init: RequestInit = {}) => {
    const request = new Request(input, init);
    const presented = request.headers.get("Authorization");
    const role = (["proprietaire", "invite"] as const).find(
      (known) => presented === `Bearer ${liens[known]}`,
    );
    if (role === undefined) return new Response(null, { status: 401 });
    const route = routes[`${request.method} ${new URL(request.url).pathname}`];
    return route ? route(role) : new Response(null, { status: 404 });
  };
}
