import { getTranslations } from "next-intl/server";
import { AddModal } from "@/components/studio/AddModal";
import { PhaseForm } from "./PhaseForm";

/**
 * Entry point for starting a new training phase — the top of a client's plan
 * tab, same pill-opens-dialog gesture as every other add flow in the app.
 */
export async function AssignPhaseModal({
  createAction,
  compact,
}: {
  createAction: (formData: FormData) => void | Promise<void>;
  compact?: boolean;
}) {
  const [t, tPhases, common] = await Promise.all([
    getTranslations("Studio.plan"),
    getTranslations("Studio.plan.phases"),
    getTranslations("Studio.common"),
  ]);

  return (
    <AddModal
      label={t("assignPhase")}
      title={tPhases("createTitle")}
      lead={tPhases("createLead")}
      compact={compact}
    >
      <PhaseForm action={createAction} submitLabel={common("create")} />
    </AddModal>
  );
}
