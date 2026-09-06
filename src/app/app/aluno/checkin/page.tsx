import { getLocale, getTranslations } from "next-intl/server";
import { requireClient } from "@/lib/studio/auth";
import { findCheckin, listCheckins } from "@/lib/studio/coaching";
import { progressPhotoWeeks } from "@/lib/studio/photos";
import { weekKey } from "@/lib/studio/dates";
import { ArcRating } from "@/components/studio/checkin/ArcRating";
import { CheckinHistory } from "@/components/studio/checkin/CheckinHistory";
import { PhotoFields } from "@/components/studio/checkin/PhotoFields";
import { CheckinPanel } from "@/components/studio/checkin/CheckinPanel";
import { WeightField } from "@/components/studio/checkin/WeightField";
import { Field } from "@/components/studio/Field";
import { AutoResizeTextarea } from "@/components/studio/AutoResizeTextarea";
import { PageHeader } from "@/components/studio/PageHeader";
import { SubmitButton } from "@/components/studio/SubmitButton";
import { field, surface, surfaceAccent } from "@/components/studio/theme";
import { SCALE_MAX } from "@/lib/studio/scale";
import { cn } from "@/lib/utils";
import { submit } from "./actions";

export default async function ClientCheckinPage() {
  const week = weekKey();
  const [client, t, common, locale] = await Promise.all([
    requireClient(),
    getTranslations("Studio.checkin"),
    getTranslations("Studio.common"),
    getLocale(),
  ]);

  const [checkin, history, photoWeeks] = await Promise.all([
    findCheckin(client.id, week),
    listCheckins(client.id),
    progressPhotoWeeks(client.id, 3),
  ]);
  const thisWeek = photoWeeks.find((entry) => entry.weekOf === week);
  const alreadyDone = checkin?.submittedAt != null;

  return (
    <div className="space-y-8">
      <PageHeader title={t("title")} lead={t("clientLead")} />

      {alreadyDone && (
        // Confirmation, not a warning: the week's check-in is done.
        <div className={cn(surfaceAccent, "px-5 py-4")}>
          <p className="font-sans text-sm font-semibold text-on-dark">{t("alreadyDone")}</p>
        </div>
      )}

      <CheckinPanel
        formLabel={t("title")}
        historyLabel={t("history")}
        form={
          <form action={submit} className={cn(surface, "space-y-7 p-5 sm:p-6")}>
            <div className="space-y-5">
              {/* Three dials and the weight box share one row and one column
                  width, so the four answers read as one instrument. */}
              <div className="grid grid-cols-2 justify-items-center gap-x-4 gap-y-6 sm:grid-cols-4">
                <ArcRating name="energy" label={t("energyLabel")} defaultValue={checkin?.energy} />
                <ArcRating name="sleep" label={t("sleepLabel")} defaultValue={checkin?.sleep} />
                <ArcRating
                  name="soreness"
                  label={t("sorenessLabel")}
                  defaultValue={checkin?.soreness}
                />
                <WeightField
                  label={t("weightLabel")}
                  hint={common("optional")}
                  unit={common("kg")}
                  defaultValue={checkin?.weightKg}
                />
              </div>
            </div>
            <Field label={t("winsLabel")} htmlFor="checkin-wins">
              <AutoResizeTextarea
                id="checkin-wins"
                name="wins"
                rows={2}
                placeholder={t("winsPlaceholder")}
                defaultValue={checkin?.wins ?? ""}
                className={field}
              />
            </Field>
            <Field label={t("blockersLabel")} htmlFor="checkin-blockers">
              <AutoResizeTextarea
                id="checkin-blockers"
                name="blockers"
                rows={2}
                placeholder={t("blockersPlaceholder")}
                defaultValue={checkin?.blockers ?? ""}
                className={field}
              />
            </Field>
            <PhotoFields clientId={client.id} weekOf={week} photos={thisWeek?.photos ?? []} />
            <div className="flex justify-end">
              <SubmitButton pendingLabel={common("sending")}>{t("submit")}</SubmitButton>
            </div>
          </form>
        }
        history={
          <CheckinHistory
            entries={history}
            locale={locale}
            t={t}
            unit={common("kg")}
            scaleMax={SCALE_MAX}
          />
        }
      />
    </div>
  );
}
