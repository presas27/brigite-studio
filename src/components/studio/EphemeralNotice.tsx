import { getTranslations } from "next-intl/server";
import { Icon } from "./coach/icons";
import { EPHEMERAL_DATA } from "@/lib/studio/paths";

/**
 * Standing warning on a deployment whose database does not outlive the request.
 *
 * Without it the app lies: a saved video link comes back on screen, and then
 * the next request lands on another instance whose `/tmp` never saw the write.
 * A coach filling a week of plans on that deserves to be told, not surprised.
 *
 * Renders nothing once `STUDIO_DATA_DIR` points at a real volume, so it removes
 * itself the moment storage becomes durable.
 */
export async function EphemeralNotice() {
  if (!EPHEMERAL_DATA) return null;

  const t = await getTranslations("Studio.common");

  return (
    <div
      role="status"
      className="mb-6 flex items-start gap-2.5 rounded-[1rem] bg-silk/10 px-4 py-3 ring-1 ring-silk/30"
    >
      <Icon name="bell" className="mt-0.5 h-4 w-4 shrink-0 text-silk" />
      <p className="font-sans text-xs leading-relaxed text-cream/80">{t("ephemeralData")}</p>
    </div>
  );
}
