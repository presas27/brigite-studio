"use client";

import { useFormStatus } from "react-dom";
import { useTranslations } from "next-intl";
import { Icon } from "@/components/studio/coach/icons";
import { MorphHeight } from "@/components/studio/MorphHeight";
import { eyebrow } from "@/components/studio/theme";
import { cn } from "@/lib/utils";

/**
 * The way into a session that does not exist yet: a blank sheet, or a run.
 *
 * Two forms, not a modal. The kind travels as a hidden field so a double tap
 * is still one request, and `useFormStatus` is what turns the button into
 * "A abrir…" without holding pending state above the form.
 */
export function StartLiveBand({
  action,
}: {
  action: (formData: FormData) => void | Promise<void>;
}) {
  const t = useTranslations("Studio.aluno.workouts");

  return (
    <section className="overflow-hidden rounded-[1.35rem] bg-cream/[0.03] ring-1 ring-cream/10">
      <div className="flex items-end justify-between gap-4 px-4 pt-4 pb-3 sm:px-5">
        <div className="min-w-0">
          <p className={eyebrow}>{t("liveEyebrow")}</p>
          <h2 className="mt-1 font-display text-[1.35rem] leading-none tracking-[0.01em] text-cream uppercase sm:text-[1.55rem]">
            {t("liveTitle")}
          </h2>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-px bg-cream/8 sm:grid-cols-[1.4fr_1fr]">
        <form action={action}>
          <input type="hidden" name="kind" value="empty" />
          <LiveStartButton
            kind="empty"
            label={t("liveStart")}
            hint={t("liveStartHint")}
            pendingLabel={t("starting")}
            primary
          />
        </form>
        <form action={action}>
          <input type="hidden" name="kind" value="run" />
          <LiveStartButton
            kind="run"
            label={t("liveRun")}
            hint={t("liveRunHint")}
            pendingLabel={t("starting")}
          />
        </form>
      </div>
    </section>
  );
}

function LiveStartButton({
  kind,
  label,
  hint,
  pendingLabel,
  primary = false,
}: {
  kind: "empty" | "run";
  label: string;
  hint: string;
  pendingLabel: string;
  primary?: boolean;
}) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className={cn(
        "flex h-full w-full items-center gap-3.5 px-4 py-4 text-left transition-[background-color,transform] duration-150 ease-out hover:bg-cream/[0.04] active:scale-[0.995] disabled:opacity-60 sm:px-5",
        primary && "bg-cream/[0.02]",
      )}
    >
      <span
        className={cn(
          "grid h-11 w-11 shrink-0 place-items-center rounded-full ring-1",
          primary
            ? "bg-butter text-on-primary ring-butter/40"
            : "bg-cream/[0.06] text-cream ring-cream/15",
        )}
      >
        <Icon name={kind === "run" ? "flame" : "play"} className="h-4 w-4" />
      </span>
      <MorphHeight contentKey={pending ? "pending" : "idle"} className="min-w-0 flex-1" fade>
        {pending ? (
          <span className="font-sans text-sm font-semibold text-cream/70">{pendingLabel}</span>
        ) : (
          <span className="block min-w-0">
            <span className="block font-sans text-sm font-semibold text-cream">{label}</span>
            <span className="mt-0.5 block font-sans text-xs leading-snug text-cream/45">{hint}</span>
          </span>
        )}
      </MorphHeight>
      <Icon
        name="chevron"
        className={cn("h-4 w-4 shrink-0", primary ? "text-butter" : "text-cream/35")}
      />
    </button>
  );
}
