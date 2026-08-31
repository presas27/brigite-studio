import Image from "next/image";
import { getLocale, getTranslations } from "next-intl/server";
import type { Locale } from "@/i18n/config";
import { cuesFor } from "@/lib/studio/cues";
import { formatRestDuration } from "@/lib/studio/duration";
import { isRestItem, type Workout, type WorkoutBlock, type WorkoutItem } from "@/lib/studio/types";
import { youtubeId, youtubeThumb } from "@/lib/youtube";
import type { PrintSections } from "./formats";

/**
 * The workout itself, on paper — the four immediate formats are this one
 * component with different sections switched on (`formats.ts` owns which).
 *
 * The data is the client's own copy of the workout, read straight from the page
 * that links here: whatever Sara changed for this client — her sets, her reps,
 * her rest — is what prints, because that copy is the only workout this route
 * ever loads. There is no template fallback to get wrong.
 */

/**
 * How many blank set rows a tracking sheet offers for one exercise: its sets,
 * or the circuit's rounds when the block is what repeats. Capped, because a
 * prescription of thirty sets is a typo and a page of empty boxes is worse than
 * a short table.
 */
function setRows(item: WorkoutItem, rounds: number, circuit: boolean): number {
  return Math.max(1, Math.min(circuit ? rounds : item.sets, 8));
}

/**
 * The prescription as the builder writes it — `prescription()` in
 * `workout/parts.tsx`, but counting a circuit's rounds instead of its sets,
 * because a printed sheet has no round counter above the list to carry it.
 */
function target(item: WorkoutItem, rounds: number, circuit: boolean): string {
  if (isRestItem(item)) return formatRestDuration(item.seconds ?? 60);
  const timed = item.seconds != null && item.reps.trim() === "";
  const measure = timed ? formatRestDuration(item.seconds ?? 0) : item.reps.trim();
  const count = circuit ? rounds : item.sets;
  return measure ? `${count} × ${measure}` : `${count}×`;
}

export async function WorkoutSheet({
  workout,
  blocks,
  equipment,
  sections,
}: {
  workout: Workout;
  /** Blocks in running order, rests included. */
  blocks: WorkoutBlock[];
  equipment: string[];
  sections: PrintSections;
}) {
  const [t, tWorkouts, locale] = await Promise.all([
    getTranslations("Studio.print"),
    getTranslations("Studio.workouts"),
    getLocale(),
  ]);

  const instructions = workout.instructions.trim();

  return (
    <div className="space-y-6">
      {sections.instructions && instructions && (
        <section className="break-inside-avoid">
          <h2 className="mb-1 text-xs font-semibold tracking-wide text-neutral-500 uppercase">
            {tWorkouts("instructionsLabel")}
          </h2>
          <p className="text-sm whitespace-pre-line text-neutral-800">{instructions}</p>
        </section>
      )}

      {sections.equipment && (
        <section className="break-inside-avoid">
          <h2 className="mb-1 text-xs font-semibold tracking-wide text-neutral-500 uppercase">
            {t("equipment")}
          </h2>
          {equipment.length > 0 ? (
            <p className="text-sm text-neutral-800">
              {equipment.map((name) => name.charAt(0).toUpperCase() + name.slice(1)).join(" · ")}
            </p>
          ) : (
            <p className="text-sm text-neutral-500">{t("noEquipment")}</p>
          )}
        </section>
      )}

      {blocks.map((block, blockIndex) => {
        const circuit = block.kind === "circuit" || block.kind === "interval";
        const grouped = block.kind !== "normal";

        return (
          <section key={block.id} className={grouped ? "border-l-2 border-neutral-300 pl-3" : ""}>
            {grouped && (
              <h2 className="mb-2 text-xs font-semibold tracking-wide text-neutral-500 uppercase">
                {circuit
                  ? `${tWorkouts("blockKind.circuit")} · ${tWorkouts("rounds", { count: block.rounds })}`
                  : tWorkouts("blockKind.superset")}
              </h2>
            )}

            <ol className="space-y-3">
              {block.items.map((item, index) => {
                const rest = isRestItem(item);
                const cues = rest ? "" : cuesFor(item, locale as Locale).trim();
                const notes = item.notes.trim();
                const video = sections.images && !rest ? youtubeId(item.videoUrl ?? "") : null;

                return (
                  <li
                    key={item.id}
                    className="flex gap-3 break-inside-avoid border-b border-neutral-200 pb-3 last:border-0"
                  >
                    <span className="w-5 shrink-0 pt-0.5 text-xs tabular-nums text-neutral-400">
                      {blockIndex + 1}.{index + 1}
                    </span>

                    {video && (
                      <span className="relative block h-14 w-20 shrink-0 overflow-hidden rounded border border-neutral-200">
                        <Image
                          src={youtubeThumb(video)}
                          alt=""
                          fill
                          sizes="160px"
                          className="object-cover"
                          unoptimized
                        />
                      </span>
                    )}

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-baseline justify-between gap-x-4">
                        <p className="text-sm font-semibold">
                          {rest ? tWorkouts("restTitle") : item.exerciseName}
                        </p>
                        {sections.prescription && (
                          <p className="text-sm tabular-nums text-neutral-700">
                            {target(item, block.rounds, circuit)}
                            {!rest && item.restSeconds > 0 && (
                              <span className="text-neutral-500">
                                {" · "}
                                {t("restShort", { rest: formatRestDuration(item.restSeconds) })}
                              </span>
                            )}
                            {!rest && item.tempo.trim() && (
                              <span className="text-neutral-500">{` · ${item.tempo.trim()}`}</span>
                            )}
                          </p>
                        )}
                      </div>

                      {sections.instructions && cues && (
                        <p className="mt-1 text-xs whitespace-pre-line text-neutral-600">{cues}</p>
                      )}
                      {sections.instructions && notes && (
                        <p className="mt-1 text-xs text-neutral-600 italic">{notes}</p>
                      )}

                      {sections.tracking && !rest && (
                        <table className="mt-2 w-full border-collapse text-[0.7rem]">
                          <thead>
                            <tr className="text-left text-neutral-500">
                              <th className="w-8 border border-neutral-300 px-1.5 py-1 font-medium">
                                {t("setColumn")}
                              </th>
                              <th className="border border-neutral-300 px-1.5 py-1 font-medium">
                                {t("weightColumn")}
                              </th>
                              <th className="border border-neutral-300 px-1.5 py-1 font-medium">
                                {t("repsColumn")}
                              </th>
                              <th className="border border-neutral-300 px-1.5 py-1 font-medium">
                                {t("restColumn")}
                              </th>
                              <th className="border border-neutral-300 px-1.5 py-1 font-medium">
                                {t("notesColumn")}
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {Array.from(
                              { length: setRows(item, block.rounds, circuit) },
                              (_, setIndex) => (
                              <tr key={setIndex}>
                                <td className="border border-neutral-300 px-1.5 py-2 tabular-nums text-neutral-400">
                                  {setIndex + 1}
                                </td>
                                <td className="border border-neutral-300 px-1.5 py-2" />
                                <td className="border border-neutral-300 px-1.5 py-2" />
                                <td className="border border-neutral-300 px-1.5 py-2" />
                                <td className="border border-neutral-300 px-1.5 py-2" />
                              </tr>
                              ),
                            )}
                          </tbody>
                        </table>
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>
          </section>
        );
      })}
    </div>
  );
}
