import { getTranslations } from "next-intl/server";
import { AddModal } from "@/components/studio/AddModal";
import { CreateExerciseForm } from "./CreateExerciseForm";

/** New exercise for Sara's library, in the app's one add-anything dialog. */
export async function AddExerciseModal() {
  const t = await getTranslations("Studio.library");
  return (
    <AddModal label={t("add")} title={t("addTitle")} width="34rem">
      <CreateExerciseForm />
    </AddModal>
  );
}
