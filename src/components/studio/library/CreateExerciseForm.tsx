"use client";

import { createExerciseAction } from "@/app/app/coach/biblioteca/actions";
import { ExerciseForm } from "./ExerciseForm";

export function CreateExerciseForm() {
  return <ExerciseForm action={createExerciseAction} idPrefix="create-exercise" />;
}
