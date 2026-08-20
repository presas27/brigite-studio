"use client";

import { updateExerciseAction } from "@/app/app/coach/exercicios/actions";
import type { Exercise } from "@/lib/studio/types";
import { ExerciseForm } from "./ExerciseForm";

export function EditExerciseForm({ exercise }: { exercise: Exercise }) {
  return (
    <ExerciseForm
      action={updateExerciseAction.bind(null, exercise.id)}
      exercise={exercise}
      idPrefix={`edit-exercise-${exercise.id}`}
    />
  );
}
