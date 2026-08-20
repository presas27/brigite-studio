import { getTranslations } from "next-intl/server";
import { AddModal } from "@/components/studio/AddModal";
import { AddClientForm } from "./AddClientForm";

/**
 * The roster's entry point for a new client. Nothing here but the wiring —
 * the pill, the dialog and the closing behaviour all come from `AddModal`, so
 * this looks and behaves exactly like adding an exercise or a workout.
 */
export async function AddClientModal() {
  const t = await getTranslations("Studio.clients");
  return (
    <AddModal label={t("add")} title={t("addTitle")} lead={t("addLead")}>
      <AddClientForm />
    </AddModal>
  );
}
