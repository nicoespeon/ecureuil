import { Dialog } from "@base-ui/react/dialog";
import type { Article, Magasin, State } from "@ecureuil/domain";
import { type RefObject, useId, useRef, useState } from "react";
import { Stepper } from "../liste/ArticleRow";
import { ConfirmButton } from "./ConfirmButton";
import { type ConfigActions, configActions, type Writer } from "./configActions";
import { NameInput } from "./NameInput";
import { RayonSelect } from "./RayonSelect";
import { useAnnouncer } from "./useAnnouncer";

export type FicheFoyer = {
  readonly state: State;
  readonly magasins: ReadonlyArray<Magasin>;
  readonly magasinActif: Magasin;
};

/**
 * The article sheet, opened from the list or from the configuration. Closed, it gives the focus back
 * to the article's name wherever the article now sits, or to `focusAfterRemove` once its row is gone.
 */
export function useFicheArticle({
  foyer,
  writer,
  focusAfterRemove,
  focusAfterClose,
}: {
  foyer: FicheFoyer;
  writer: Writer;
  focusAfterRemove: RefObject<HTMLElement | null>;
  /** Where the focus goes on close, whatever became of the article, when the opener is not a row. */
  focusAfterClose?: RefObject<HTMLElement | null>;
}) {
  const [articleId, setArticleId] = useState<string | null>(null);
  const lastArticleId = useRef<string | null>(null);
  const article = articleId === null ? undefined : foyer.state.articles[articleId];
  const actions = configActions(writer, foyer.magasinActif.id);

  return {
    openFiche: (id: string) => {
      lastArticleId.current = id;
      setArticleId(id);
    },
    fiche: (
      <Dialog.Root open={article !== undefined} onOpenChange={(open) => open || setArticleId(null)}>
        <Dialog.Portal>
          <Dialog.Backdrop className="fixed inset-0 z-30 bg-black/40" />
          <Dialog.Popup
            finalFocus={() =>
              focusAfterClose?.current ??
              ficheTrigger(lastArticleId.current) ??
              focusAfterRemove.current
            }
            className="fixed inset-0 z-40 flex flex-col overflow-y-auto bg-white text-neutral-950 sm:inset-auto sm:top-1/2 sm:left-1/2 sm:max-h-[calc(100dvh-2rem)] sm:w-[28rem] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-lg sm:shadow-xl"
          >
            {article && (
              <FicheContent article={article} magasins={foyer.magasins} actions={actions} />
            )}
          </Dialog.Popup>
        </Dialog.Portal>
      </Dialog.Root>
    ),
  };
}

/** The buttons that open an article's sheet carry `data-fiche-article-id`. */
function ficheTrigger(articleId: string | null) {
  if (articleId === null) return null;
  const trigger = document.querySelector(`[data-fiche-article-id="${CSS.escape(articleId)}"]`);
  return trigger instanceof HTMLElement ? trigger : null;
}

function FicheContent({
  article,
  magasins,
  actions,
}: {
  article: Article;
  magasins: ReadonlyArray<Magasin>;
  actions: ConfigActions;
}) {
  const nameId = useId();
  const toBuyId = useId();
  const rayonsId = useId();
  const { announcement, announce } = useAnnouncer();

  return (
    <>
      <div className="flex h-14 items-center gap-2 border-b border-neutral-300 px-4">
        <Dialog.Title className="min-w-0 flex-1 truncate text-lg font-semibold">
          {article.name}
        </Dialog.Title>
        <Dialog.Close className={closeClassName}>Fermer</Dialog.Close>
      </div>
      <div className="flex flex-col gap-5 p-4">
        <div className="flex flex-col gap-1">
          <label htmlFor={nameId} className={labelClassName}>
            Nom
          </label>
          <NameInput
            id={nameId}
            name={article.name}
            rename={(name) => actions.renameArticle(article.id, name)}
          />
        </div>
        <div className="flex items-center justify-between gap-4">
          <label htmlFor={toBuyId} className="flex min-h-11 items-center gap-3 text-base">
            <input
              id={toBuyId}
              type="checkbox"
              checked={article.status !== "notToBuy"}
              onChange={(event) => actions.setToBuy(article.id, event.currentTarget.checked)}
              className="size-6 accent-neutral-900"
            />
            À acheter
          </label>
          <Stepper article={article} actions={{ setQuantity: actions.setQuantity, announce }} />
        </div>
        <fieldset className="flex flex-col gap-3">
          <legend className={`${labelClassName} mb-1`}>Rayon par magasin</legend>
          {magasins.map((magasin) => (
            <div key={magasin.id} className="flex flex-col gap-1">
              <label htmlFor={`${rayonsId}-${magasin.id}`} className="text-base">
                {magasin.name}
              </label>
              <RayonSelect
                id={`${rayonsId}-${magasin.id}`}
                article={article}
                magasin={magasin}
                label={`Rayon chez ${magasin.name}`}
                setArticleRayon={actions.setArticleRayon}
              />
            </div>
          ))}
        </fieldset>
        <div className="flex items-center justify-end gap-2 border-t border-neutral-200 pt-4">
          <ConfirmButton
            subject={article.name}
            warning={{ announce, message: `Supprimer ${article.name} ?` }}
            onConfirm={() => actions.removeArticle(article.id)}
            withLabel
          />
        </div>
      </div>
      <p role="status" className="sr-only">
        {announcement}
      </p>
    </>
  );
}

const labelClassName = "text-sm font-medium text-neutral-800";

const closeClassName =
  "h-11 shrink-0 rounded-md px-3 text-base font-medium text-neutral-900 hover:bg-neutral-100 focus-visible:outline-2 focus-visible:outline-blue-700";
