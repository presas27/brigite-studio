import { getTranslations } from "next-intl/server";
import { AddModal } from "@/components/studio/AddModal";
import { AssignForm } from "./AssignForm";

type WorkoutOption = { id: string; name: string };

/**
 * Entry point for putting a workout on a client's calendar. A dialog rather
 * than the inline, always-expanded card it used to be — that card grew tall
 * enough to shove the week nav and "repeat week" into an unrelated row above
 * it every time it opened.
 */
export async function AssignWorkoutModal({
  workouts,
  defaultDate,
  assignAction,
  compact = false,
}: {
  workouts: WorkoutOption[];
  defaultDate: string;
  assignAction: (formData: FormData) => void | Promise<void>;
  /** Small pill — it now shares the week nav's row instead of heading the tab. */
  compact?: boolean;
}) {
  const t = await getTranslations("Studio.plan");
  return (
    <AddModal label={t("assign")} title={t("assignTitle")} compact={compact}>
      <AssignForm workouts={workouts} defaultDate={defaultDate} assignAction={assignAction} />
    </AddModal>
  );
}
