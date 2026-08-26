import { getTranslations } from "next-intl/server";
import { AdherenceCard } from "@/components/studio/aluno/overview/AdherenceCard";
import { FocusRing } from "@/components/studio/aluno/overview/FocusRing";
import { StreakCard } from "@/components/studio/aluno/overview/StreakCard";
import { TodayCard } from "@/components/studio/aluno/overview/TodayCard";
import { WeekCard } from "@/components/studio/aluno/overview/WeekCard";
import { WeightCard } from "@/components/studio/aluno/overview/WeightCard";
import { heading } from "@/components/studio/theme";
import { requireClient } from "@/lib/studio/auth";
import { clientOverview } from "@/lib/studio/clientConsole";
import { dayKey } from "@/lib/studio/dates";
import { assignmentsOn, nextAssignment } from "@/lib/studio/plan";
import { cn } from "@/lib/utils";

/**
 * Hoje — the screen an aluna lands on, and the mirror of Sara's overview.
 *
 * Same question, from the other side: what do I do right now. Two cards carry
 * the reading — how much of the plan is holding, and what it is made of — and
 * the gold band under them carries the answer: the session, and the button that
 * opens it. Nothing else gets the accent, and the band says nothing the button
 * does not need.
 *
 * The reading is one call: `clientOverview` composes it so the adherence number
 * and the dots beside it come out of the same query and cannot drift apart.
 */
export default async function AlunoHojePage() {
  const client = await requireClient();

  const t = await getTranslations("Studio.aluno");

  const today = dayKey();
  const [overview, todaySessions, next] = await Promise.all([
    clientOverview(client.id),
    assignmentsOn(client.id, today),
    nextAssignment(client.id, today),
  ]);

  // Today's session is the hero; with nothing today the gold moves to the next
  // one, and the list below drops it so it is never printed twice.
  const todaySession = todaySessions.find((assignment) => assignment.status !== "skipped");
  const hero = todaySession ?? next;
  const upcoming = overview.upcoming
    .filter((session) => session.id !== hero?.id)
    .slice(0, 3);

  return (
    // `<main>` is exactly the viewport's remaining height (see `StudioChrome`); the `-1.5rem`
    // leaves a sliver of breathing room under the cards instead of stretching them flush to
    // the bottom edge. Both columns below stretch to fill whatever that leaves, and `<main>`'s
    // own scrollbar (not the document's) is the fallback on a day the content doesn't fit.
    <div className="grid gap-8 xl:h-[calc(100%_-_1.5rem)] xl:grid-cols-[minmax(0,1fr)_26rem]">
      <div className="min-w-0 space-y-6">
        <header>
          <h1 className={cn(heading, "text-[2rem] sm:text-[2.5rem]")}>
            {t("greeting", { name: client.name.split(" ")[0] })}
          </h1>
        </header>

        {/* Two squares and a band. The reading sits up top, side by side at
            every width — a phone included, which is where this page is
            actually opened — and the gold runs underneath as a strip carrying
            the only thing here she can press. */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          <AdherenceCard
            done={overview.adherenceDone}
            total={overview.adherenceTotal}
            pct={overview.adherencePct}
            dots={overview.dots}
          />

          <FocusRing focus={overview.focus} />

          <TodayCard
            session={hero}
            isToday={todaySession != null}
            className="col-span-2"
          />
        </div>
      </div>

      {/* The week and the number that matters most, not a feed of what already
          happened — that reads as an afterthought this far up the page. */}
      <aside className="flex min-w-0 flex-col gap-6">
        <WeekCard week={overview.week} today={today} upcoming={upcoming} />

        {/* Grows to the column's full stretched height instead of stopping at its own
            content — otherwise it falls short of the left column and leaves the gap
            underneath it bare. */}
        {overview.weight ? (
          <WeightCard weight={overview.weight} className="flex-1" />
        ) : (
          <StreakCard weeks={overview.streakWeeks} className="flex-1" />
        )}
      </aside>
    </div>
  );
}
