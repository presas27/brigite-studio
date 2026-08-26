"use server";

import { revalidatePath } from "next/cache";
import { requireClient } from "@/lib/studio/auth";
import { recordMeasurement } from "@/lib/studio/coaching";

function parsePositiveNumber(formData: FormData, name: string): number | undefined {
  const raw = formData.get(name);
  if (typeof raw !== "string" || raw.trim() === "") return undefined;
  const value = Number(raw);
  return Number.isFinite(value) && value > 0 ? value : undefined;
}

export async function submit(formData: FormData): Promise<void> {
  const client = await requireClient();

  const weightKg = parsePositiveNumber(formData, "weightKg");
  const heightCm = parsePositiveNumber(formData, "heightCm");
  if (weightKg == null || heightCm == null) return;

  await recordMeasurement({ clientId: client.id, kind: "weight", value: weightKg });
  await recordMeasurement({ clientId: client.id, kind: "height", value: heightCm });

  revalidatePath("/app/aluno/medidas");
  revalidatePath("/app/aluno/progresso");
}
