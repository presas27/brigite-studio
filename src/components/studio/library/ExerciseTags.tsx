"use client";

import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";
import { saveTagsAction, type FieldState } from "@/app/app/coach/exercicios/actions";
import { Icon } from "../coach/icons";
import { chip } from "../theme";
import { cn } from "@/lib/utils";

const initial: FieldState = { status: "idle" };

/**
 * The exercise's categories, at a size worth reading, with a way to add one.
 *
 * Direct manipulation rather than a form with a save button: a tag is one word,
 * and adding or dropping one is not a change worth confirming. Every action
 * posts the whole list computed from the row on screen, so there is no local
 * copy to drift out of step with the server.
 *
 * The tracking chip travels with them — how a movement is measured is the same
 * kind of fact as what it trains — but it is the one label here Sara cannot
 * invent, so it reads in the accent ink without taking the accent surface. A
 * filled brand pill at this size would be the loudest thing on a page whose
 * subject is a video.
 */
export function ExerciseTags({
  exerciseId,
  tags,
  tracking,
}: {
  exerciseId: string;
  tags: string[];
  tracking: string;
}) {
  const t = useTranslations("Studio.library");
  const common = useTranslations("Studio.common");
  const [, formAction] = useActionState(saveTagsAction.bind(null, exerciseId), initial);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState("");

  function close() {
    setAdding(false);
    setDraft("");
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className={cn(chip, "px-3.5 py-1.5 text-sm text-accent-ink ring-caramel/20")}>
        {tracking}
      </span>
      {tags.map((tag) => (
        // One form per chip: the × posts the list without this tag, so removing
        // needs no client state and works with the same action as adding.
        <form key={tag} action={formAction}>
          <input type="hidden" name="tags" value={tags.filter((other) => other !== tag).join(",")} />
          <button
            type="submit"
            aria-label={t("removeTag", { tag })}
            className={cn(
              chip,
              "group cursor-pointer px-3.5 py-1.5 text-sm transition-colors hover:bg-cream/10 hover:text-cream",
            )}
          >
            {tag}
            <Icon
              name="close"
              className="h-3 w-3 text-cream/25 transition-colors group-hover:text-cream/70"
            />
          </button>
        </form>
      ))}

      {adding ? (
        <form
          action={formAction}
          onSubmit={close}
          onKeyDown={(event) => {
            if (event.key === "Escape") close();
          }}
          className="flex items-center gap-1.5"
        >
          <input type="hidden" name="tags" value={[...tags, draft].join(",")} />
          <input
            autoFocus
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder={t("tagPlaceholder")}
            aria-label={t("addTag")}
            className="w-44 rounded-full bg-cream/5 px-3.5 py-1.5 font-sans text-sm text-cream ring-1 ring-cream/20 outline-none transition focus:ring-2 focus:ring-accent-ink/70"
          />
          <button
            type="submit"
            disabled={draft.trim() === ""}
            className="inline-flex items-center rounded-full px-3 py-1.5 font-sans text-sm font-semibold text-accent-ink transition-colors hover:bg-cream/5 disabled:opacity-40"
          >
            {common("add")}
          </button>
        </form>
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="inline-flex cursor-pointer items-center gap-1.5 rounded-full px-3.5 py-1.5 font-sans text-sm font-medium text-cream/60 ring-1 ring-dashed ring-cream/25 transition-colors hover:bg-cream/5 hover:text-cream hover:ring-cream/45"
        >
          <Icon name="plus" className="h-3.5 w-3.5" />
          {t("addTag")}
        </button>
      )}
    </div>
  );
}
