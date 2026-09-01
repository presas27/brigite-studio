import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { Empty } from "@/components/studio/Empty";
import { PageHeader } from "@/components/studio/PageHeader";
import { AddProgramModal } from "@/components/studio/programs/AddProgramModal";
import { ProgramLibrary } from "@/components/studio/programs/ProgramLibrary";
import { requireCoach } from "@/lib/studio/auth";
import { listPrograms } from "@/lib/studio/programs";

export const metadata: Metadata = {
  title: "Programas",
  robots: { index: false, follow: false },
};

/**
 * Reusable training programs: the multi-week shape of a block of training, kept
 * as a template instead of rewritten into every client's plan.
 *
 * Both shelves are fetched in one call and split on the client, the same way the
 * workout library does it — the tab counts have to be right whichever tab is
 * open, so there is nothing to save by asking for one shelf at a time.
 */
export default async function ProgramsPage() {
  await requireCoach();

  const [t, locale, programs] = await Promise.all([
    getTranslations("Studio.programs"),
    getLocale(),
    listPrograms(),
  ]);

  return (
    <div className="space-y-8">
      <PageHeader title={t("title")} lead={t("lead")} action={<AddProgramModal />} />

      {programs.length === 0 ? (
        <Empty title={t("empty")} hint={t("emptyHint")} />
      ) : (
        <ProgramLibrary programs={programs} locale={locale} />
      )}
    </div>
  );
}
