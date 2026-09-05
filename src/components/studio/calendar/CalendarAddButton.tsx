"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Icon, type IconName } from "@/components/studio/coach/icons";
import { Modal } from "@/components/studio/Modal";
import { buttonPrimary } from "@/components/studio/theme";
import { cn } from "@/lib/utils";

type AddKind =
  | "workout"
  | "cardio"
  | "meal"
  | "water"
  | "appointment"
  | "photos"
  | "bodyStats"
  | "sleep";

const ENTRIES: { kind: AddKind; icon: IconName; href: (date: string) => string | null }[] = [
  { kind: "workout", icon: "dumbbell", href: () => "/app/aluno/treinos" },
  { kind: "cardio", icon: "flame", href: () => "/app/aluno/treinos" },
  { kind: "meal", icon: "library", href: () => null },
  { kind: "water", icon: "clock", href: () => null },
  { kind: "appointment", icon: "phone", href: () => "/app/aluno/mensagens" },
  { kind: "photos", icon: "eye", href: () => "/app/aluno/evolucao" },
  { kind: "bodyStats", icon: "ruler", href: () => "/app/aluno/medidas" },
  { kind: "sleep", icon: "checkin", href: () => "/app/aluno/checkin" },
];

/**
 * The plus on the aluna's calendar. Opens a sheet of things she can log on
 * the day she has selected — workouts that already exist in the app, and the
 * ones that do not yet, marked so she is not sent into a dead end.
 */
export function CalendarAddButton({ date }: { date: string }) {
  const t = useTranslations("Studio.plan.calendar");
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={t("add")}
        className={cn(buttonPrimary, "h-8 gap-1.5 rounded-full px-3 py-0 text-xs")}
      >
        <Icon name="plus" className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">{t("add")}</span>
      </button>

      <Modal open={open} onCloseAction={() => setOpen(false)} title={t("addTitle")} lead={t("addLead", { date })} width="24rem">
        <ul className="grid grid-cols-2 gap-2">
          {ENTRIES.map((entry) => {
            const href = entry.href(date);
            const label = t(`addKind.${entry.kind}`);
            const className = cn(
              "flex items-center gap-2.5 rounded-[1rem] px-3 py-3 text-left ring-1 ring-cream/10 transition-colors",
              href ? "bg-cream/[0.04] hover:bg-cream/[0.08]" : "cursor-not-allowed bg-cream/[0.02] opacity-45",
            );
            const inner = (
              <>
                <Icon name={entry.icon} className="h-4 w-4 text-accent-ink" />
                <span className="font-sans text-sm font-semibold text-cream">{label}</span>
              </>
            );
            return (
              <li key={entry.kind}>
                {href ? (
                  <Link href={href} className={className} onClick={() => setOpen(false)}>
                    {inner}
                  </Link>
                ) : (
                  <span className={className} title={t("addSoon")}>
                    {inner}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      </Modal>
    </>
  );
}
