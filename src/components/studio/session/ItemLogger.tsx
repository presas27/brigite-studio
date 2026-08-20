"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import type { WorkoutItem, SetLog } from "@/lib/studio/types";
import { chip, eyebrow } from "../theme";
import { EMPTY_SET, SetRow, type SetValue } from "./SetRow";
import { RestTimer } from "./RestTimer";

/**
 * One exercise inside the session: its cues and demo, a rest timer, a link to
 * send Sara a video of it, and one `SetRow` per `item.sets`. `entries` is the
 * whole session's set values keyed `itemId:setIndex`; this component only
 * ever reads its own item's slice of it.
 */
export function ItemLogger({
  item,
  assignmentId,
  entries,
  previous,
  onChangeSet,
}: {
  item: WorkoutItem;
  assignmentId: string;
  entries: Record<string, SetValue>;
  previous: SetLog[];
  onChangeSet: (setIndex: number, value: SetValue) => void;
}) {
  const t = useTranslations("Studio.session");
  const common = useTranslations("Studio.common");

  const cueLines = item.cues.split("\n").filter((line) => line.trim().length > 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-sans text-base font-semibold text-cream">{item.exerciseName}</h3>
          <div className="mt-1.5 flex flex-wrap gap-2">
            <span className={chip}>
              {item.sets} {common("sets")}
            </span>
            {(item.tracking === "reps" || item.tracking === "distance") && item.reps && (
              <span className={chip}>
                {item.reps} {item.tracking === "distance" ? t("distanceMeters") : common("reps")}
              </span>
            )}
            {(item.tracking === "time" || item.tracking === "hold") && item.seconds != null && (
              <span className={chip}>{item.seconds}s</span>
            )}
            {item.tempo && (
              <span className={chip}>
                {common("tempo")} {item.tempo}
              </span>
            )}
            {item.rpe && (
              <span className={chip}>
                {common("rpe")} {item.rpe}
              </span>
            )}
          </div>
        </div>
        <RestTimer seconds={item.restSeconds} />
      </div>

      {item.notes && <p className="text-sm text-cream/60">{item.notes}</p>}

      {cueLines.length > 0 && (
        <div>
          <p className={eyebrow}>{t("cues")}</p>
          <ul className="mt-1 list-disc space-y-1 pl-4 text-sm leading-relaxed text-cream/70">
            {cueLines.map((line, index) => (
              <li key={index}>{line}</li>
            ))}
          </ul>
        </div>
      )}

      {item.mediaId ? (
        <video
          controls
          preload="none"
          className="w-full max-w-sm rounded-[1rem] bg-black"
          src={`/app/media/${item.mediaId}`}
        />
      ) : (
        item.videoUrl && (
          <a
            href={item.videoUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-block text-sm text-accent-ink underline underline-offset-2"
          >
            {t("watchDemo")}
          </a>
        )
      )}

      <div className="space-y-3">
        {Array.from({ length: item.sets }, (_, setIndex) => (
          <SetRow
            key={setIndex}
            index={setIndex}
            tracking={item.tracking}
            value={entries[`${item.id}:${setIndex}`] ?? EMPTY_SET}
            previous={previous[setIndex]}
            onChange={(value) => onChangeSet(setIndex, value)}
          />
        ))}
      </div>

      <Link
        href={`/app/aluno/videos?exercicio=${item.exerciseId}&treino=${assignmentId}`}
        className="inline-flex items-center gap-1.5 text-xs text-cream/55 underline decoration-cream/30 underline-offset-2 transition-colors hover:text-cream"
      >
        {t("sendVideo")}
      </Link>
    </div>
  );
}
