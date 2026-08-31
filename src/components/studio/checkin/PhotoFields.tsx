import { getTranslations } from "next-intl/server";
import { eyebrow, muted } from "@/components/studio/theme";
import { PHOTO_ANGLES } from "@/lib/studio/photos";
import type { ProgressPhoto } from "@/lib/studio/types";
import { cn } from "@/lib/utils";
import { PhotoAngleField } from "./PhotoAngleField";

/**
 * The three angles, side by side, inside the check-in form.
 *
 * Each one is independent and each one is optional: a client who only shoots
 * the front this week has a check-in with one photo, and the log renders it
 * without a hole where the others would be.
 */
export async function PhotoFields({
  clientId,
  weekOf,
  photos,
}: {
  clientId: string;
  weekOf: string;
  /** Whatever this week already has. */
  photos: ProgressPhoto[];
}) {
  const t = await getTranslations("Studio.photos");

  return (
    <fieldset className="space-y-2">
      <legend className={cn(eyebrow, "mb-1")}>{t("fieldsLabel")}</legend>
      <p className={cn(muted, "text-xs")}>{t("fieldsHint")}</p>
      <div className="grid grid-cols-3 gap-3">
        {PHOTO_ANGLES.map((angle) => (
          <PhotoAngleField
            key={angle}
            clientId={clientId}
            weekOf={weekOf}
            angle={angle}
            label={t(`angle.${angle}`)}
            existing={photos.find((photo) => photo.angle === angle)}
          />
        ))}
      </div>
    </fieldset>
  );
}
