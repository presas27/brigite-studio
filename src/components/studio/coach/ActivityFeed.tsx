import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import type { ActivityItem } from "@/lib/studio/types";
import { relativeTime } from "@/components/studio/chat/relative-time";
import { eyebrow, muted, surface } from "@/components/studio/theme";
import { cn } from "@/lib/utils";

/**
 * What has happened, newest first — the studio's pulse.
 *
 * Deliberately not clickable-per-word like the Trainerize original: every row
 * is one link to the place the event happened, because a feed where three
 * different words go three different places is a feed you learn to distrust.
 */
export async function ActivityFeed({ items }: { items: ActivityItem[] }) {
  const [t, locale] = await Promise.all([getTranslations("Studio.activity"), getLocale()]);

  // Check-in rows carry a `YYYY-MM-DD` week key as their subject. Dropped into
  // a sentence raw it reads like a database field, so it gets formatted here —
  // the feed is the only place that knows the reader's locale.
  const dayFormat = new Intl.DateTimeFormat(locale, { day: "numeric", month: "long" });
  const subjectOf = (item: ActivityItem) => {
    if (item.subject == null) return "";
    if (!/^\d{4}-\d{2}-\d{2}$/.test(item.subject)) return item.subject;
    return dayFormat.format(new Date(`${item.subject}T12:00:00`));
  };

  return (
    <section aria-labelledby="activity-heading" className="space-y-3">
      <h2 id="activity-heading" className={eyebrow}>
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
                {/* The avatar is always the client the row is about — the row's
                    subject. A caramel fill marks the ones Sara herself caused,
                    so actor and subject stay legible without a second glyph. */}
                <span
                  className={cn(
                    "mt-px grid h-7 w-7 shrink-0 place-items-center rounded-full font-sans text-[0.7rem] font-semibold",
                    item.actor === "coach"
                      ? "bg-accent-fill text-ink"
                      : "bg-cream/10 text-cream/70 ring-1 ring-cream/10",
                  )}
                >
                  {item.clientName.trim().charAt(0).toUpperCase()}
                </span>

                <span className="min-w-0 flex-1">
                  <span className="font-sans text-[0.8125rem] leading-snug text-cream/70">
                    <span className="font-semibold text-cream">{item.clientName}</span>{" "}
                    {t(`kind.${item.kind}`, { subject: subjectOf(item) })}
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
