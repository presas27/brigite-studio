"use server";

import { revalidatePath } from "next/cache";
import { requireClient } from "@/lib/studio/auth";
import { submitCheckin } from "@/lib/studio/coaching";
import { weekKey } from "@/lib/studio/dates";
import { clampScale } from "@/lib/studio/scale";

/** Free-text fields — generous but bounded, this is a weekly note, not a journal. */
const MAX_TEXT = 2000;

/** Clamp a dial's raw value onto the scale; a blank or malformed one is ignored. */
function parseScale(formData: FormData, name: string): number | undefined {
  const raw = formData.get(name);
  if (typeof raw !== "string" || raw === "") return undefined;
  const value = Number(raw);
  return Number.isFinite(value) ? clampScale(value) : undefined;
}

function parseWeight(formData: FormData): number | undefined {
  const raw = formData.get("weightKg");
  if (typeof raw !== "string" || raw.trim() === "") return undefined;
  const value = Number(raw);
  return Number.isFinite(value) && value > 0 ? value : undefined;
}

export async function submit(formData: FormData): Promise<void> {
  const client = await requireClient();

  await submitCheckin({
    clientId: client.id,
    weekOf: weekKey(),
    energy: parseScale(formData, "energy"),
    sleep: parseScale(formData, "sleep"),
    soreness: parseScale(formData, "soreness"),
    weightKg: parseWeight(formData),
    wins: String(formData.get("wins") ?? "").trim().slice(0, MAX_TEXT),
    blockers: String(formData.get("blockers") ?? "").trim().slice(0, MAX_TEXT),
  });

  revalidatePath("/app/aluno/checkin");
  revalidatePath("/app/aluno");
}
