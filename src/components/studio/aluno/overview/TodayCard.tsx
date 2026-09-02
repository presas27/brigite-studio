import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { Empty } from "@/components/studio/Empty";
import {
  buttonGhost,
  buttonOnAccent,
  eyebrowOnAccent,
  heading,
  surfaceAccent,
} from "@/components/studio/theme";
import type { ScheduledAssignment } from "@/lib/studio/types";
import { capitalize, cn } from "@/lib/utils";

/**
 * The screen's one gold surface — the session, and the button that starts it.
 *
 * A band, not a panel: the name of the session and the button that opens it,
 * and nothing else. Everything a session is made of — the focus, Sara's note,
 * the blocks — lives one tap away on the session screen itself, and printing it
 * here made the gold the tallest thing on the page for information nobody reads
 * before pressing start. The accent is for the action; the cards above it carry
 * the reading.
 *
 * It keeps the accent because it is still the only thing on this page an aluna
 * can act on in the next five minutes. When today is empty the gold moves to
 * the next session rather than disappearing — with the date said out loud, so
 * the band never invites her to start something scheduled for Thursday.
 *
 * Everything nested here is ink-side: the `-onAccent` variants exist because
 * cream text vanishes on caramel.
 */
export async function TodayCard({
  session,
  isToday,
  coachName,
  className,
}: {
  session: ScheduledAssignment | undefined;
  /** Whether `session` is today's, or the next one ahead. Changes only the label. */
  isToday: boolean;
  /** Who to ask when the plan is empty. `null` for someone training alone. */
  coachName: string | null;
  className?: string;
}) {
  const [t, tSession, locale] = await Promise.all([
    getTranslations("Studio.aluno"),
    getTranslations("Studio.session"),
    getLocale(),
  ]);

  if (!session) {
    // With a coach the empty plan is theirs to fill; alone, it is yours.
    return (
      <Empty
        title={tSession("planEmpty")}
        hint={coachName ? tSession("planEmptyHint") : tSession("planEmptyHintSolo")}
        action={
          coachName ? (
            <Link href="/app/aluno/mensagens" className={cn(buttonGhost, "mt-1")}>
              {t("askCoach", { name: coachName.split(" ")[0] })}
            </Link>
          ) : (
            <Link href="/app/aluno/treinos" className={cn(buttonGhost, "mt-1")}>
              {t("buildWorkout")}
            </Link>
          )
        }
        className={cn("justify-center", className)}
      />
    );
  }

  const when = capitalize(
    new Intl.DateTimeFormat(locale, {
      weekday: "long",
      day: "numeric",
      month: "long",
      timeZone: "Europe/Lisbon",
    }).format(new Date(`${session.date}T12:00:00Z`)),
    locale,
  );

  return (
    <section
      aria-labelledby="today-session"
      className={cn(
        surfaceAccent,
        "flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:gap-6 sm:p-6",
        className,
      )}
    >
      <div className="min-w-0">
        {/* Only when it is not today's: on today's session the date is noise,
            and on any other day leaving it out would read as "start this now". */}
        {!isToday && (
          <p className={cn(eyebrowOnAccent, "mb-1")}>{`${tSession("nextUp")} · ${when}`}</p>
        )}
        <h2
          id="today-session"
          className={cn(heading, "text-[1.6rem] break-words sm:text-[2rem]")}
        >
          {session.snapshot.name}
        </h2>
      </div>

      <Link
        href={`/app/aluno/treino/${session.id}`}
        className={cn(buttonOnAccent, "w-full shrink-0 px-8 py-4 text-base sm:w-auto")}
      >
        {session.startedAt ? tSession("resume") : tSession("start")}
      </Link>
    </section>
  );
}
