"use server";

import { saveIntakeForm } from "@/lib/studio/intake";

export type IntakeFieldType =
  | "text"
  | "textarea"
  | "number"
  | "date"
  | "yesno"
  | "select"
  | "multiselect";

export async function saveCoachForm(input: {
  title: string;
  intro: string;
  published: boolean;
  fields: {
    id: string;
    position: number;
    type: IntakeFieldType;
    label: string;
    hint: string;
    required: boolean;
    options: string[];
  }[];
}): Promise<void> {
  await saveIntakeForm(input);
}
