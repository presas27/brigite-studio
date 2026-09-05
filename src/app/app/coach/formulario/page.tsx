import { getTranslations } from "next-intl/server";
import { FormBuilder } from "@/components/studio/intake/FormBuilder";
import { PageHeader } from "@/components/studio/PageHeader";
import { muted } from "@/components/studio/theme";
import { requireCoach } from "@/lib/studio/auth";
import { coachIntakeForm } from "@/lib/studio/intake";

export default async function CoachFormPage() {
  await requireCoach();
  const [t, form] = await Promise.all([getTranslations("Studio.intake"), coachIntakeForm()]);

  return (
    <div className="space-y-6">
      <PageHeader title={t("builderTitle")} />
      <p className={muted}>{t("builderLead")}</p>
      <FormBuilder
        initialTitle={form.title}
        initialIntro={form.intro}
        initialPublished={form.published}
        initialFields={form.fields.map((field) => ({
          ...field,
          type: field.type,
        }))}
      />
    </div>
  );
}
