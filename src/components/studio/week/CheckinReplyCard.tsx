import Link from "next/link";
import { parseDayKey } from "@/components/studio/plan/date";
import { ScaleBar } from "@/components/studio/plan/ScaleBar";
import type { Translate } from "@/components/studio/plan/types";
import { Field } from "@/components/studio/Field";
import { SubmitButton } from "@/components/studio/SubmitButton";
import { eyebrow, field, heading, surface } from "@/components/studio/theme";
import { cn } from "@/lib/utils";
import type { Checkin } from "@/lib/studio/types";

/**
 * One client's unanswered check-in on the studio-wide board. Same content as
 * the per-client `CheckinCard` (this is the "needs Sara" case, first-class),
 * plus the client's name since this list spans every aluna at once. Kept
 * separate from `CheckinCard` because the reply form here posts a bare
 * `checkinId` — the global `reply` action has no bound `clientId` to scope it.
 */
export function CheckinReplyCard({
  clientId,
  clientName,
  checkin,
  locale,
  t,
  replyAction,
}: {
  clientId: string;
  clientName: string;
  checkin: Checkin;
  locale: string;
  t: Translate;
  replyAction: (formData: FormData) => void | Promise<void>;
}) {
  const dateLabel = new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  }).format(parseDayKey(checkin.weekOf));

  return (
    <div className={cn(surface, "ring-2 ring-caramel/50", "space-y-4 p-5")}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div className="min-w-0">
          <Link
            href={`/app/coach/alunos/${clientId}/checkins`}
            className={cn(eyebrow, "block truncate transition-colors hover:text-cream")}
          >
            {clientName}
          </Link>
          <p className={cn(heading, "text-lg")}>{t("weekOf", { date: dateLabel })}</p>
        </div>
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

      <form action={replyAction} className="space-y-2 border-t border-cream/10 pt-4">
        <input type="hidden" name="checkinId" value={checkin.id} />
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
    </div>
  );
}
