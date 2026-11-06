import { type Actor, inviteLienPath, type LienResponse, lienPath } from "@ecureuil/wire";

export const API_URL = "https://api.ecureuil.test";

/**
 * `/lien` and `/lien/invite` as `@ecureuil/wire` describes them, in memory. A `null` invite
 * secret: the invite has no lien yet.
 */
export function fakeLienApi(
  secrets: { proprietaire: string; invite: string | null },
  inviteCreatedAt = 0,
) {
  const liens = { ...secrets };
  let invite: LienResponse["invite"] =
    secrets.invite === null ? null : { createdAt: inviteCreatedAt };
  let regenerated = 0;

  const routes: Record<string, (role: Actor) => Response> = {
    [`GET ${lienPath}`]: (role) => Response.json({ role, invite } satisfies LienResponse),
    [`POST ${inviteLienPath}`]: (role) => {
      if (role !== "proprietaire") return new Response(null, { status: 403 });
      regenerated += 1;
      liens.invite = `secret-invite-${regenerated}`;
      invite = { createdAt: Date.now() };
      return Response.json({ secret: liens.invite });
    },
  };

  return async (input: string, init: RequestInit = {}) => {
    const request = new Request(input, init);
    const presented = request.headers.get("Authorization");
    const role = (["proprietaire", "invite"] as const).find(
      (known) => liens[known] !== null && presented === `Bearer ${liens[known]}`,
    );
    if (role === undefined) return new Response(null, { status: 401 });
    const route = routes[`${request.method} ${new URL(request.url).pathname}`];
    return route ? route(role) : new Response(null, { status: 404 });
  };
}
