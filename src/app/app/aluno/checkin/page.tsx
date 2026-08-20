import { getLocale, getTranslations } from "next-intl/server";
import { requireClient } from "@/lib/studio/auth";
import { findCheckin, listCheckins } from "@/lib/studio/coaching";
import { weekKey } from "@/lib/studio/db";
import { Empty } from "@/components/studio/Empty";
import { Field } from "@/components/studio/Field";
import { PageHeader } from "@/components/studio/PageHeader";
import { SubmitButton } from "@/components/studio/SubmitButton";
import {
  chip,
  eyebrow,
  field,
  fieldCompact,
  heading,
  muted,
  surface,
  surfaceAccent,
} from "@/components/studio/theme";
import { cn } from "@/lib/utils";
import { submit } from "./actions";

const SCALE_VALUES = [1, 2, 3, 4, 5] as const;

/** One 1-5 scale rendered as tappable pills — no `<select>`, no slider, 44px targets. */
function ScaleField({
  name,
  label,
  value,
}: {
  name: string;
  label: string;
  value: number | null | undefined;
}) {
  return (
    <div className="space-y-1.5">
      <span className={eyebrow}>{label}</span>
      <div className="flex gap-1.5">
        {SCALE_VALUES.map((n) => (
          <label
            key={n}
            className={cn(
              "flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-full font-mono text-sm text-cream/70 ring-1 ring-cream/15 transition-colors hover:bg-cream/5",
              "has-checked:bg-butter has-checked:text-ink has-checked:ring-butter",
            )}
          >
            <input type="radio" name={name} value={n} defaultChecked={value === n} className="sr-only" />
            {n}
          </label>
        ))}
      </div>
    </div>
  );
}

/** `weekOf` is a `YYYY-MM-DD` Monday key; parsed at noon so no timezone can shift it to another day. */
function formatWeekLabel(weekOf: string, locale: string): string {
  const date = new Date(`${weekOf}T12:00:00`);
  return new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "long",
    timeZone: "Europe/Lisbon",
  }).format(date);
}

export default async function ClientCheckinPage() {
  const client = await requireClient();
  const t = await getTranslations("Studio.checkin");
  const common = await getTranslations("Studio.common");
  const locale = await getLocale();

  const week = weekKey();
  const checkin = findCheckin(client.id, week);
  const alreadyDone = checkin?.submittedAt != null;
  const history = listCheckins(client.id);

  return (
    <div className="space-y-8">
      <PageHeader title={t("title")} />

      {alreadyDone && (
        // Confirmation, not a warning: the week's check-in is done.
        <div className={cn(surfaceAccent, "px-5 py-4")}>
          <p className="font-sans text-sm font-semibold text-ink">{t("alreadyDone")}</p>
        </div>
      )}

      <form action={submit} className={cn(surface, "space-y-6 p-5 sm:p-6")}>
        <div className="space-y-3">
          <p className={muted}>{t("scaleHint")}</p>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <ScaleField name="energy" label={t("energyLabel")} value={checkin?.energy} />
            <ScaleField name="sleep" label={t("sleepLabel")} value={checkin?.sleep} />
            <ScaleField name="soreness" label={t("sorenessLabel")} value={checkin?.soreness} />
            <Field label={t("weightLabel")} htmlFor="checkin-weight" hint={common("optional")}>
              <input
                id="checkin-weight"
                name="weightKg"
                type="number"
                step="0.1"
                min="0"
                inputMode="decimal"
                defaultValue={checkin?.weightKg ?? ""}
                className={fieldCompact}
              />
            </Field>
          </div>
        </div>
        <Field label={t("winsLabel")} htmlFor="checkin-wins">
          <textarea
            id="checkin-wins"
            name="wins"
            rows={2}
            placeholder={t("winsPlaceholder")}
            defaultValue={checkin?.wins ?? ""}
            className={field}
          />
        </Field>
        <Field label={t("blockersLabel")} htmlFor="checkin-blockers">
          <textarea
            id="checkin-blockers"
            name="blockers"
            rows={2}
            placeholder={t("blockersPlaceholder")}
            defaultValue={checkin?.blockers ?? ""}
            className={field}
          />
        </Field>
        <SubmitButton pendingLabel={common("sending")}>{t("submit")}</SubmitButton>
      </form>

      <section className="space-y-3">
        <h2 className={cn(heading, "text-lg")}>{t("history")}</h2>
        {history.length === 0 ? (
          <Empty title={t("empty")} hint={t("emptyHint")} />
        ) : (
          <ul className="space-y-3">
            {history.map((entry) => (
              <li key={entry.id} className={cn(surface, "space-y-3 p-4 sm:p-5")}>
                <p className="font-sans text-sm font-semibold text-cream">
                  {t("weekOf", { date: formatWeekLabel(entry.weekOf, locale) })}
                </p>
                <div className="flex flex-wrap gap-2">
                  {entry.energy != null && (
                    <span className={chip}>
                      {t("energyLabel")} {entry.energy}
                    </span>
                  )}
                  {entry.sleep != null && (
                    <span className={chip}>
                      {t("sleepLabel")} {entry.sleep}
                    </span>
                  )}
                  {entry.soreness != null && (
                    <span className={chip}>
                      {t("sorenessLabel")} {entry.soreness}
                    </span>
                  )}
                  {entry.weightKg != null && (
                    <span className={chip}>
                      {t("weightLabel")} {entry.weightKg} {common("kg")}
                    </span>
                  )}
                </div>
                {(entry.wins || entry.blockers) && (
                  <div className="space-y-1.5">
                    {entry.wins && <p className={muted}>{entry.wins}</p>}
                    {entry.blockers && <p className={muted}>{entry.blockers}</p>}
                  </div>
                )}
                <div className="border-t border-cream/10 pt-3">
                  {entry.reply ? (
                    <>
                      <p className={eyebrow}>{t("coachReply")}</p>
                      <p className="mt-1 font-sans text-sm text-cream/80">{entry.reply}</p>
                    </>
                  ) : (
                    <p className={muted}>{t("awaitingReply")}</p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
