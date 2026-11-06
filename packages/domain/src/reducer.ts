import type { ArticleRayon, Event } from "@ecureuil/wire";
import { Data, Match } from "effect";

export type Magasin = {
  readonly id: string;
  readonly name: string;
  readonly rayons: ReadonlyArray<Rayon>;
};

export type Rayon = { readonly id: string; readonly name: string };

export type Article = {
  readonly id: string;
  readonly name: string;
  readonly quantity: number;
  readonly status: ArticleStatus;
  /**
   * Per magasin. An absent magasin means NonClasse ("Non classé").
   */
  readonly rayonParMagasin: Readonly<
    Record<string, Exclude<ArticleRayon, { readonly _tag: "NonClasse" }>>
  >;
};

/**
 * "notToBuy" = in the catalogue only; "toBuy" = on the list; "inCart" = checked during a sortie.
 */
export type ArticleStatus = "notToBuy" | "toBuy" | "inCart";

/**
 * One shopping run, closed by "Terminer les courses".
 */
export type Sortie = {
  readonly id: string;
  readonly magasin: string;
  readonly at: number;
  readonly achats: ReadonlyArray<{ readonly articleId: string; readonly quantity: number }>;
};

/**
 * An article the guest asks for; the first decision is final, the owner's verdict or the guest
 * withdrawing it.
 */
export type Demande = {
  readonly id: string;
  readonly name: string;
  readonly requestedAt: number;
  readonly status: DemandeStatus;
};

export type DemandeStatus = Data.TaggedEnum<{
  Pending: Record<never, never>;
  Accepted: { readonly articleId: string };
  Refused: Record<never, never>;
  /** Taken back by the invite while still pending. */
  Withdrawn: Record<never, never>;
}>;
const DemandeStatus = Data.taggedEnum<DemandeStatus>();

export type State = {
  readonly magasins: Readonly<Record<string, Magasin>>;
  readonly articles: Readonly<Record<string, Article>>;
  readonly demandes: Readonly<Record<string, Demande>>;
  readonly sorties: ReadonlyArray<Sortie>;
};

export const initialState: State = { magasins: {}, articles: {}, demandes: {}, sorties: [] };

/**
 * Devices sync out of order and may resend: the journal is replayed in one total order
 * (timestamp, then event id), each event once. Conflict rules fall out of that order.
 */
export function fold(events: ReadonlyArray<Event>) {
  const unique = [...new Map(events.map((event) => [event.id, event])).values()];
  return unique.sort(byTimestampThenId).reduce(apply, initialState);
}

function byTimestampThenId(a: Event, b: Event) {
  return a.at - b.at || compare(a.id, b.id);
}

function compare(a: string, b: string) {
  if (a < b) return -1;
  return a > b ? 1 : 0;
}

function apply(state: State, event: Event): State {
  return applyEvent(event)(state);
}

const applyEvent = Match.type<Event>().pipe(
  Match.discriminatorsExhaustive("type")({
    MagasinCreated: (event) => (state: State) =>
      state.magasins[event.magasin]
        ? state
        : withMagasin(state, { id: event.magasin, name: event.payload.name, rayons: [] }),
    MagasinRenamed: (event) => (state: State) =>
      updateMagasin(state, event.magasin, (magasin) => ({ ...magasin, name: event.payload.name })),
    MagasinRemoved: (event) => (state: State) => {
      const { [event.magasin]: _removed, ...magasins } = state.magasins;
      return updateArticles({ ...state, magasins }, (article) =>
        unsetRayon(article, event.magasin),
      );
    },
    RayonCreated: (event) => (state: State) =>
      updateMagasin(state, event.magasin, (magasin) =>
        magasin.rayons.some((rayon) => rayon.id === event.payload.rayonId)
          ? magasin
          : {
              ...magasin,
              rayons: [...magasin.rayons, { id: event.payload.rayonId, name: event.payload.name }],
            },
      ),
    RayonRenamed: (event) => (state: State) =>
      updateMagasin(state, event.magasin, (magasin) => ({
        ...magasin,
        rayons: magasin.rayons.map((rayon) =>
          rayon.id === event.payload.rayonId ? { ...rayon, name: event.payload.name } : rayon,
        ),
      })),
    RayonsReordered: (event) => (state: State) =>
      updateMagasin(state, event.magasin, (magasin) => ({
        ...magasin,
        rayons: reorder(magasin.rayons, event.payload.rayonIds),
      })),
    RayonRemoved: (event) => (state: State) => {
      const { rayonId } = event.payload;
      const withoutRayon = updateMagasin(state, event.magasin, (magasin) => ({
        ...magasin,
        rayons: magasin.rayons.filter((rayon) => rayon.id !== rayonId),
      }));
      return updateArticles(withoutRayon, (article) => {
        const articleRayon = article.rayonParMagasin[event.magasin];
        return articleRayon?._tag === "Rayon" && articleRayon.rayonId === rayonId
          ? unsetRayon(article, event.magasin)
          : article;
      });
    },
    ArticleCreated: (event) => (state: State) =>
      state.articles[event.payload.articleId]
        ? state
        : withArticle(state, {
            id: event.payload.articleId,
            name: event.payload.name,
            quantity: 1,
            status: "notToBuy",
            rayonParMagasin: {},
          }),
    ArticleRenamed: (event) => (state: State) =>
      updateArticle(state, event.payload.articleId, (article) => ({
        ...article,
        name: event.payload.name,
      })),
    ArticleQuantitySet: (event) => (state: State) =>
      updateArticle(state, event.payload.articleId, (article) => ({
        ...article,
        quantity: event.payload.quantity,
      })),
    ArticleRemoved: (event) => (state: State) => {
      const { [event.payload.articleId]: _removed, ...articles } = state.articles;
      return { ...state, articles };
    },
    ArticleRayonSet: (event) => (state: State) => {
      const { rayon: articleRayon } = event.payload;
      const magasin = state.magasins[event.magasin];
      if (!magasin) return state;
      if (
        articleRayon._tag === "Rayon" &&
        !magasin.rayons.some((rayon) => rayon.id === articleRayon.rayonId)
      ) {
        return state;
      }
      return updateArticle(state, event.payload.articleId, (article) =>
        articleRayon._tag === "NonClasse"
          ? unsetRayon(article, event.magasin)
          : {
              ...article,
              rayonParMagasin: { ...article.rayonParMagasin, [event.magasin]: articleRayon },
            },
      );
    },
    ArticleMarkedToBuy: (event) => (state: State) =>
      updateArticle(state, event.payload.articleId, list),
    ArticleMarkedNotToBuy: (event) => (state: State) =>
      updateArticle(state, event.payload.articleId, (article) => ({
        ...article,
        status: "notToBuy",
      })),
    ArticleChecked: (event) => (state: State) =>
      updateArticle(state, event.payload.articleId, (article) =>
        article.status === "notToBuy" ? article : { ...article, status: "inCart" },
      ),
    ArticleUnchecked: (event) => (state: State) =>
      updateArticle(state, event.payload.articleId, (article) =>
        article.status === "inCart" ? { ...article, status: "toBuy" } : article,
      ),
    SortieFinished: (event) => (state: State) => {
      const bought = Object.values(state.articles).filter((article) => article.status === "inCart");
      const sortie: Sortie = {
        id: event.id,
        magasin: event.magasin,
        at: event.at,
        achats: bought.map(({ id, quantity }) => ({ articleId: id, quantity })),
      };
      const emptied = updateArticles(state, (article) =>
        article.status === "inCart" ? { ...article, status: "notToBuy" } : article,
      );
      return { ...emptied, sorties: [...state.sorties, sortie] };
    },
    DemandeCreated: (event) => (state: State) =>
      state.demandes[event.payload.demandeId]
        ? state
        : withDemande(state, {
            id: event.payload.demandeId,
            name: event.payload.name,
            requestedAt: event.at,
            status: DemandeStatus.Pending(),
          }),
    DemandeAccepted: (event) => (state: State) => {
      const { demandeId, articleId } = event.payload;
      const demande = pendingDemande(state, demandeId);
      // Accepting toward an unknown article would settle the demande for nothing: stay pending.
      if (!demande || !state.articles[articleId]) return state;
      const accepted = { ...demande, status: DemandeStatus.Accepted({ articleId }) };
      return updateArticle(withDemande(state, accepted), articleId, list);
    },
    DemandeRefused: (event) => (state: State) => {
      const demande = pendingDemande(state, event.payload.demandeId);
      return demande ? withDemande(state, { ...demande, status: DemandeStatus.Refused() }) : state;
    },
    DemandeWithdrawn: (event) => (state: State) => {
      const demande = pendingDemande(state, event.payload.demandeId);
      return demande
        ? withDemande(state, { ...demande, status: DemandeStatus.Withdrawn() })
        : state;
    },
  }),
);

function withMagasin(state: State, magasin: Magasin): State {
  return { ...state, magasins: { ...state.magasins, [magasin.id]: magasin } };
}

function updateMagasin(
  state: State,
  magasinId: string,
  update: (magasin: Magasin) => Magasin,
): State {
  const magasin = state.magasins[magasinId];
  return magasin ? withMagasin(state, update(magasin)) : state;
}

/**
 * Rayons created concurrently on another device keep their place after the given order.
 */
function reorder(rayons: ReadonlyArray<Rayon>, rayonIds: ReadonlyArray<string>) {
  const mentioned = [...new Set(rayonIds)].flatMap((id) =>
    rayons.filter((rayon) => rayon.id === id),
  );
  const unmentioned = rayons.filter((rayon) => !rayonIds.includes(rayon.id));
  return [...mentioned, ...unmentioned];
}

function withArticle(state: State, article: Article): State {
  return { ...state, articles: { ...state.articles, [article.id]: article } };
}

function updateArticle(
  state: State,
  articleId: string,
  update: (article: Article) => Article,
): State {
  const article = state.articles[articleId];
  return article ? withArticle(state, update(article)) : state;
}

function updateArticles(state: State, update: (article: Article) => Article): State {
  const articles = Object.values(state.articles).map(
    (article) => [article.id, update(article)] as const,
  );
  return { ...state, articles: Object.fromEntries(articles) };
}

/**
 * Puts an article on the list; already listed or in the panier, it stays where it is.
 */
function list(article: Article): Article {
  return article.status === "notToBuy" ? { ...article, status: "toBuy" } : article;
}

function unsetRayon(article: Article, magasinId: string): Article {
  const { [magasinId]: _unfiled, ...rayonParMagasin } = article.rayonParMagasin;
  return { ...article, rayonParMagasin };
}

function withDemande(state: State, demande: Demande): State {
  return { ...state, demandes: { ...state.demandes, [demande.id]: demande } };
}

/**
 * The demande while it is still pending. First arbitration wins, so a later verdict finds
 * nothing to settle.
 */
function pendingDemande(state: State, demandeId: string) {
  const demande = state.demandes[demandeId];
  return demande?.status._tag === "Pending" ? demande : undefined;
}
