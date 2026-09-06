import { redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { Icon } from "@/components/studio/coach/icons";
import { formatDayKey } from "@/components/studio/format";
import {
  chip,
  chipAccent,
  heading,
  muted,
  surface,
} from "@/components/studio/theme";
import { requireClientAccess } from "@/lib/studio/auth";
import { intakeResponseForClient } from "@/lib/studio/intake";
import { cn } from "@/lib/utils";

/**
 * Dedicated intake form inspection tab for the coach.
 * Answers are grouped into visual cards by section with pill chips for tags
 * and prominent badges for sensitive health flags, eliminating raw 30-item text dumps.
 */
export default async function ClientIntakePage({
  params,
}: {
  params: Promise<{ clientId: string }>;
}) {
  const { clientId } = await params;
  const { viewer, client } = await requireClientAccess(clientId);
  if (viewer.role !== "coach") redirect("/app/aluno");
  const [tIntake, common, locale, intake] = await Promise.all([
    getTranslations("Studio.intake"),
    getTranslations("Studio.common"),
    getLocale(),
    intakeResponseForClient(client.id),
  ]);

  if (!intake) {
    return (
      <div className={cn(surface, "p-8 text-center sm:p-12")}>
        <p className="font-sans text-base font-semibold text-cream">
          {tIntake("responseTitle")}
        </p>
        <p className={cn(muted, "mt-2")}>{tIntake("responseEmpty")}</p>
      </div>
    );
  }

  // Group answers by section
  const sectionGroups = new Map<string, typeof intake.answers>();
  for (const answer of intake.answers) {
    const sec = answer.section?.trim() || "Geral";
    if (!sectionGroups.has(sec)) sectionGroups.set(sec, []);
    sectionGroups.get(sec)!.push(answer);
  }

  const sections = Array.from(sectionGroups.entries()).map(([title, answers]) => ({
    title,
    answers,
    hasFlags: answers.some((a) => a.flagged),
  }));

  const submittedDate = formatDayKey(
    new Date(intake.submittedAt).toISOString().slice(0, 10),
    locale,
  );

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-cream/10 pb-4">
        <div>
          <h2 className={cn(heading, "text-[1.5rem] text-cream sm:text-[1.75rem]")}>
            {tIntake("responseTitle")}
          </h2>
          <p className={cn(muted, "mt-1 text-xs sm:text-sm")}>
            {tIntake("submittedAt", { date: submittedDate })}
          </p>
        </div>

        {intake.hasSensitiveAlerts && (
          <div className="inline-flex items-center gap-2 rounded-full bg-silk/15 px-3.5 py-1.5 ring-1 ring-silk/30 text-silk">
            <Icon name="alert" className="h-4 w-4 shrink-0" />
            <span className="font-sans text-xs font-semibold">
              {intake.sensitiveCount}{" "}
              {tIntake("healthAlertBadge").toLowerCase()}
            </span>
          </div>
        )}
      </div>

      {/* Health alert banner if flagged */}
      {intake.hasSensitiveAlerts && (
        <div className="flex items-start gap-3 rounded-[1.25rem] bg-silk/15 p-4 sm:p-5 ring-1 ring-silk/40 text-cream">
          <Icon name="alert" className="h-5 w-5 shrink-0 text-silk mt-0.5" />
          <div className="space-y-1">
            <p className="font-sans text-sm font-semibold text-silk">
              {tIntake("healthAlertBadge")}
            </p>
            <p className="text-xs sm:text-sm text-cream/85 leading-relaxed">
              {tIntake("healthAlertBanner")}
            </p>
          </div>
        </div>
      )}

      {/* Clean 2-column or responsive section cards */}
      <div className="grid gap-6 md:grid-cols-2">
        {sections.map(({ title, answers, hasFlags }) => (
          <section
            key={title}
            className={cn(
              surface,
              "flex flex-col space-y-4 p-5 sm:p-6",
              hasFlags && "ring-1 ring-silk/30 bg-ink-lift",
            )}
          >
            <div className="flex items-center justify-between gap-2 border-b border-cream/10 pb-3">
              <h3 className={cn(heading, "text-base text-cream sm:text-lg")}>
                {title}
              </h3>
              {hasFlags && (
                <span className="rounded-full bg-silk/20 px-2.5 py-0.5 font-sans text-[0.65rem] font-semibold text-silk">
                  {tIntake("healthAlertBadge")}
                </span>
              )}
            </div>

            <div className="space-y-3.5 divide-y divide-cream/6">
              {answers.map((answer) => {
                const val = answer.value.trim();
                const isMultiLine = val.includes("\n");
                const isYesNo = val.toLowerCase() === "yes" || val.toLowerCase() === "no" || val.toLowerCase() === "sim" || val.toLowerCase() === "não";

                return (
                  <div
                    key={answer.fieldId}
                    className={cn(
                      "pt-3 first:pt-0 space-y-1.5",
                      answer.flagged && "rounded-[0.8rem] bg-silk/10 p-3 -mx-1 ring-1 ring-silk/25",
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p
                        className={cn(
                          "font-sans text-xs font-medium leading-snug",
                          answer.flagged ? "text-silk font-semibold" : "text-cream/55",
                        )}
                      >
                        {answer.label}
                      </p>
                      {answer.flagged && (
                        <span className="shrink-0 rounded-full bg-silk/20 px-2 py-0.5 font-sans text-[0.65rem] font-semibold text-silk">
                          {tIntake("healthAlertBadge")}
                        </span>
                      )}
                    </div>

                    {/* Value rendering */}
                    {isMultiLine ? (
                      <div className="flex flex-wrap gap-1.5 pt-0.5">
                        {val.split("\n").filter(Boolean).map((item) => (
                          <span
                            key={item}
                            className="inline-flex items-center rounded-full bg-cream/8 px-2.5 py-1 font-sans text-xs font-medium text-cream/85 ring-1 ring-cream/10"
                          >
                            {item}
                          </span>
                        ))}
                      </div>
                    ) : isYesNo ? (
                      <div className="pt-0.5">
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 font-sans text-xs font-semibold",
                            answer.flagged
                              ? "bg-silk/25 text-silk ring-1 ring-silk/40"
                              : val.toLowerCase() === "yes" || val.toLowerCase() === "sim"
                                ? chipAccent
                                : chip,
                          )}
                        >
                          {val.toLowerCase() === "yes" || val.toLowerCase() === "sim"
                            ? tIntake("yes")
                            : tIntake("no")}
                        </span>
                      </div>
                    ) : val === "true" ? (
                      <p className="flex items-center gap-1.5 font-sans text-xs font-medium text-accent-ink pt-0.5">
                        <Icon name="check" className="h-4 w-4" />
                        {tIntake("consentConfirmed")}
                      </p>
                    ) : (
                      <p
                        className={cn(
                          "font-sans text-sm leading-relaxed whitespace-pre-line",
                          val ? "text-cream/90" : "text-cream/35",
                        )}
                      >
                        {val || common("none")}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
