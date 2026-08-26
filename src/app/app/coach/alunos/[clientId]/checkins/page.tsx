import { redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { Empty } from "@/components/studio/Empty";
import { CheckinCard } from "@/components/studio/plan/CheckinCard";
import { parseDayKey } from "@/components/studio/plan/date";
import { eyebrow, heading, surface } from "@/components/studio/theme";
import { cn } from "@/lib/utils";
import { requireClientAccess } from "@/lib/studio/auth";
import { weekKey } from "@/lib/studio/dates";
import { listCheckins } from "@/lib/studio/coaching";
import { reply } from "./actions";

const HISTORY_LIMIT = 12;

export default async function CoachCheckinsPage({
  params,
  searchParams,
}: {
  params: Promise<{ clientId: string }>;
  searchParams: Promise<{ respondido?: string }>;
}) {
  const { clientId } = await params;
  const { viewer } = await requireClientAccess(clientId);
  if (viewer.role !== "coach") redirect("/app/aluno");

  const { respondido } = await searchParams;
  const [t, locale] = await Promise.all([getTranslations("Studio.checkin"), getLocale()]);

  const checkins = await listCheckins(clientId, HISTORY_LIMIT);

  return (
    <div className="space-y-6">
      {checkins.length === 0 ? (
        <Empty title={t("empty")} hint={t("emptyHint")} />
      ) : (
        <>
          {!checkins.some((checkin) => checkin.weekOf === weekKey()) && (
            <div className={cn(surface, "flex flex-wrap items-center justify-between gap-2 p-4")}>
              <p className={eyebrow}>
                {t("weekOf", {
                  date: new Intl.DateTimeFormat(locale, {
                    day: "numeric",
                    month: "long",
                    timeZone: "UTC",
                  }).format(parseDayKey(weekKey())),
                })}
              </p>
              <p className="text-sm text-cream/55">{t("notSubmitted")}</p>
            </div>
          )}

          {checkins
            .filter((checkin) => checkin.repliedAt == null)
            .map((checkin) => (
              <CheckinCard
                key={checkin.id}
                checkin={checkin}
                locale={locale}
                t={t}
                replyAction={reply.bind(null, clientId, checkin.id)}
              />
            ))}

          {checkins.some((checkin) => checkin.repliedAt != null) && (
            <div className="space-y-4">
              <h2 className={cn(heading, "text-lg text-cream/70")}>{t("history")}</h2>
              {checkins
                .filter((checkin) => checkin.repliedAt != null)
                .map((checkin) => (
                  <CheckinCard
                    key={checkin.id}
                    checkin={checkin}
                    locale={locale}
                    t={t}
                    justReplied={respondido === checkin.id}
                  />
                ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
