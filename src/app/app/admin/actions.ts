"use server";

import { refresh } from "next/cache";
import { requireAdmin } from "@/lib/studio/auth";
import { updateCoachBilling } from "@/lib/studio/billing";

export async function saveCoachBilling(formData: FormData): Promise<void> {
  await requireAdmin();
  const coachId = String(formData.get("coachId") ?? "");
  const included = Number(formData.get("includedClients"));
  const euros = Number(formData.get("priceEuros"));
  if (!coachId || !Number.isFinite(included) || !Number.isFinite(euros)) return;
  await updateCoachBilling({
    coachId,
    exempt: formData.get("exempt") === "on",
    includedClients: included,
    pricePerClientCents: Math.round(euros * 100),
  });
  refresh();
}
