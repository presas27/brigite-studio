import { cn } from "@/lib/utils";
import type { Checkin } from "@/lib/studio/types";
import { Field } from "../Field";
import { SubmitButton } from "../SubmitButton";
import { chipAccent, eyebrow, field, heading, surface } from "../theme";
import { parseDayKey } from "./date";
import { ScaleBar } from "./ScaleBar";
import type { Translate } from "./types";

/**
 * One week's check-in. `replyAction` present means it is still waiting on
 * Sara — renders the reply form, ring-highlighted so it reads as first-class
 * against the answered history below it.
 */
export function CheckinCard({
  checkin,
  locale,
  t,
  replyAction,
  justReplied,
}: {
  checkin: Checkin;
  locale: string;
  t: Translate;
  replyAction?: (formData: FormData) => void | Promise<void>;
  justReplied?: boolean;
}) {
  const dateLabel = new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  }).format(parseDayKey(checkin.weekOf));
  const pending = replyAction != null;

  return (
    <div className={cn(surface, pending && "ring-2 ring-caramel/50", "space-y-4 p-5")}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className={cn(heading, "text-lg")}>{t("weekOf", { date: dateLabel })}</p>
        {checkin.weightKg != null && (
          <p className="font-sans text-sm text-cream/70">
            {t("weightLabel")} · {checkin.weightKg} kg
          </p>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <ScaleBar label={t("energyLabel")} value={checkin.energy} />
        <ScaleBar label={t("sleepLabel")} value={checkin.sleep} />
        <ScaleBar label={t("sorenessLabel")} value={checkin.soreness} />
      </div>

      {(checkin.wins || checkin.blockers) && (
        <div className="grid gap-3 sm:grid-cols-2">
          {checkin.wins && (
            <div>
              <p className={eyebrow}>{t("winsLabel")}</p>
              <p className="mt-1 text-sm leading-relaxed text-cream/80">{checkin.wins}</p>
            </div>
          )}
          {checkin.blockers && (
            <div>
              <p className={eyebrow}>{t("blockersLabel")}</p>
              <p className="mt-1 text-sm leading-relaxed text-cream/80">{checkin.blockers}</p>
            </div>
          )}
        </div>
      )}

      <div className="border-t border-cream/10 pt-4">
        {pending ? (
          <form action={replyAction} className="space-y-2">
            <Field label={t("replyLabel")} htmlFor={`reply-${checkin.id}`}>
              <textarea
                id={`reply-${checkin.id}`}
                name="reply"
                rows={3}
                required
                placeholder={t("replyPlaceholder")}
                className={field}
              />
            </Field>
            <SubmitButton pendingLabel={t("sendReply")}>{t("sendReply")}</SubmitButton>
          </form>
        ) : (
          <div>
            <div className="flex items-center gap-2">
              <p className={eyebrow}>{t("coachReply")}</p>
              {justReplied && <span className={chipAccent}>{t("replySent")}</span>}
            </div>
            <p className="mt-1 text-sm leading-relaxed text-cream/80">{checkin.reply}</p>
          </div>
        )}
      </div>
    </div>
  );
}
