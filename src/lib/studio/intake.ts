import "server-only";

import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { sm, sq } from "./convexServer";

export async function coachIntakeForm() {
  return sq(api.intake.myForm);
}

export async function intakeFormForInvite(token: string) {
  return sq(api.intake.formForInvite, { token });
}

export async function myPendingIntake() {
  return sq(api.intake.myPendingIntake);
}

export async function saveIntakeForm(input: {
  title: string;
  intro: string;
  published: boolean;
  fields: {
    id: string;
    position: number;
    type: "text" | "textarea" | "number" | "date" | "yesno" | "select" | "multiselect";
    label: string;
    hint: string;
    required: boolean;
    options: string[];
  }[];
}) {
  await sm(api.intake.saveForm, input);
}

export async function submitIntake(input: {
  token: string;
  answers: { fieldId: string; value: string }[];
}) {
  await sm(api.intake.submitAndAccept, input);
}

export async function intakeResponseForClient(clientId: string) {
  return sq(api.intake.responseForClient, { clientId: clientId as Id<"users"> });
}
