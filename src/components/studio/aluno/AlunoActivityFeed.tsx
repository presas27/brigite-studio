import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { relativeTime } from "@/components/studio/chat/relative-time";
import { Icon, type IconName } from "@/components/studio/coach/icons";
import { eyebrow, muted, surface } from "@/components/studio/theme";
import type { ClientActivityItem } from "@/lib/studio/clientConsole";
import { cn } from "@/lib/utils";

const ICON: Record<ClientActivityItem["kind"], IconName> = {
  session: "dumbbell",
  skipped: "calendar",
  submission: "video",
  review: "video",
  checkin: "checkin",
  checkinReply: "checkin",
  message: "message",
  coachMessage: "message",
};

/**
 * What has happened, newest first — the aluna's own thread of the studio.
 *
 * Written in the second person and split by who acted: a caramel glyph is
 * Sara, a quiet one is the aluna herself. That is the whole point of the panel
 * — it answers "has she looked at my stuff yet" without opening four screens.
 */
export async function AlunoActivityFeed({ items }: { items: ClientActivityItem[] }) {
  const [t, locale] = await Promise.all([
    getTranslations("Studio.aluno.activity"),
    getLocale(),
  ]);

  // Check-in rows carry a `YYYY-MM-DD` week key as their subject. Dropped into
  // a sentence raw it reads like a database field, so it gets formatted here.
  const dayFormat = new Intl.DateTimeFormat(locale, { day: "numeric", month: "long" });
  const subjectOf = (item: ClientActivityItem) => {
    if (item.subject == null) return "";
    if (!/^\d{4}-\d{2}-\d{2}$/.test(item.subject)) return item.subject;
    return dayFormat.format(new Date(`${item.subject}T12:00:00`));
  };

  // A clip can be sent without naming an exercise, and "Enviaste um vídeo de ."
  // is worse than saying less — those two kinds get a subject-free sentence.
  const sentenceKey = (item: ClientActivityItem) =>
    item.subject == null && (item.kind === "submission" || item.kind === "review")
      ? `kind.${item.kind}Plain`
      : `kind.${item.kind}`;

  return (
    <section aria-labelledby="aluno-activity" className="space-y-3">
      <h2 id="aluno-activity" className={eyebrow}>
        {t("title")}
      </h2>

      {items.length === 0 ? (
        <div className={cn(surface, "p-5")}>
          <p className="font-sans text-sm font-semibold text-cream/85">{t("empty")}</p>
          <p className={cn(muted, "mt-1")}>{t("emptyHint")}</p>
        </div>
      ) : (
        <ol className={cn(surface, "divide-y divide-cream/8")}>
          {items.map((item) => (
            <li key={item.id}>
              <Link
                href={item.href}
                className="flex items-start gap-3 px-4 py-3 transition-colors hover:bg-cream/[0.04]"
              >
                <span
                  className={cn(
                    "mt-px grid h-7 w-7 shrink-0 place-items-center rounded-full",
                    item.actor === "coach"
                      ? "bg-accent-fill text-ink"
                      : "bg-cream/10 text-cream/60 ring-1 ring-cream/10",
                  )}
                >
                  <Icon name={ICON[item.kind]} className="h-3.5 w-3.5" />
                </span>

                <span className="min-w-0 flex-1">
                  <span className="block font-sans text-[0.8125rem] leading-snug text-cream/75">
                    {t(sentenceKey(item), { subject: subjectOf(item) })}
                  </span>
                  <span className="mt-1 block font-sans text-[0.65rem] text-cream/35">
                    {relativeTime(item.at, locale)}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
