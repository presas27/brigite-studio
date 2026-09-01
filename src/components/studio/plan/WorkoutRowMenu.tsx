"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { useTranslations } from "next-intl";
import { Modal } from "@/components/studio/Modal";
import { Toast } from "@/components/studio/Toast";
import { Icon } from "@/components/studio/coach/icons";
import { buttonDanger, buttonGhost, buttonQuiet, muted, surface } from "@/components/studio/theme";
import type { LibraryCategory, PhaseWorkout } from "@/lib/studio/types";
import { cn } from "@/lib/utils";

/** Where a copy can be filed, in the order the popup offers them. */
const DESTINATIONS: readonly LibraryCategory[] = ["master", "shared"];

/** One row of the menu. Shared so the three entries cannot drift apart. */
function MenuItem({
  icon,
  label,
  hint,
  onClick,
  disabled,
  danger,
  submenu,
}: {
  icon: "copy" | "eye" | "eyeOff" | "trash";
  label: string;
  hint?: string;
  onClick: () => void;
  disabled?: boolean;
  /** Destructive. Never the visual default — see `buttonDanger` in `theme.ts`. */
  danger?: boolean;
  /** Draws the chevron that says "this one opens something to the side". */
  submenu?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      aria-haspopup={submenu ? "menu" : undefined}
      className={cn(
        "flex w-full items-start gap-3 rounded-[0.85rem] px-3 py-2.5 text-left transition-colors",
        "disabled:opacity-40",
        danger ? "hover:bg-silk/10" : "hover:bg-cream/5",
      )}
    >
      <Icon
        name={icon}
        className={cn("mt-0.5 h-4 w-4 shrink-0", danger ? "text-silk" : "text-accent-ink")}
      />
      <span className="min-w-0 flex-1">
        <span
          className={cn(
            "block font-sans text-sm font-semibold",
            danger ? "text-silk" : "text-cream",
          )}
        >
          {label}
        </span>
        {hint && <span className={cn(muted, "mt-0.5 block text-xs")}>{hint}</span>}
      </span>
      {submenu && <Icon name="chevron" className="mt-1 h-3.5 w-3.5 shrink-0 text-cream/40" />}
    </button>
  );
}

/**
 * The "⋮" on a phase workout row: copy it into the library, hide it from the
 * client, or delete it.
 *
 * It replaced a bare bin icon, which is the reason the three are grouped at all:
 * a row that offers only "delete" makes deletion the obvious thing to do with a
 * workout you are finished with, when hiding it is almost always what the coach
 * actually wants. Delete keeps its own divider and the silk colour so it cannot
 * be hit on the way to the other two, and it still asks before it goes.
 *
 * "Copy" is a submenu with one entry rather than a direct action, because the
 * copy has to ask *where* — and a menu item that opens a popup that opens
 * another popup reads worse than a flyout that names its one destination.
 */
export function WorkoutRowMenu({
  workout,
  copyAction,
  hideAction,
  removeAction,
}: {
  workout: PhaseWorkout;
  /** Files a copy of this workout on one of the coach's library shelves. */
  copyAction: (formData: FormData) => void | Promise<void>;
  /** Toggles whether the client's app shows this workout at all. */
  hideAction: (formData: FormData) => void | Promise<void>;
  removeAction: (formData: FormData) => void | Promise<void>;
}) {
  const t = useTranslations("Studio.plan.phases");
  const common = useTranslations("Studio.common");
  const [open, setOpen] = useState(false);
  const [submenu, setSubmenu] = useState(false);
  const [copyOpen, setCopyOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [destination, setDestination] = useState<LibraryCategory>("master");
  const [toast, setToast] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const rootRef = useRef<HTMLDivElement>(null);

  // Same dismissal contract as `WorkoutScheduleMenu`: the pointer landing
  // outside closes it, and Escape closes it from the keyboard. Both are removed
  // with the panel so a page of rows does not keep dozens of live listeners.
  useEffect(() => {
    if (!open) return;
    function onPointer(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) close();
    }
    function onKey(event: KeyboardEvent) {
      // Escape backs out of the submenu first, then the menu — one step at a
      // time, the way a nested menu is expected to behave.
      if (event.key !== "Escape") return;
      if (submenu) setSubmenu(false);
      else close();
    }
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, submenu]);

  useGSAP(
    () => {
      if (!open) return;
      gsap.matchMedia().add("(prefers-reduced-motion: no-preference)", () => {
        gsap.fromTo(
          "[data-menu-panel]",
          { autoAlpha: 0, y: -6, scale: 0.97 },
          { autoAlpha: 1, y: 0, scale: 1, duration: 0.18, ease: "power2.out" },
        );
      });
    },
    { dependencies: [open], scope: rootRef },
  );

  useGSAP(
    () => {
      if (!submenu) return;
      gsap.matchMedia().add("(prefers-reduced-motion: no-preference)", () => {
        // Slides in from the parent's edge, so the flyout reads as coming out of
        // the row it belongs to rather than appearing beside it.
        gsap.fromTo(
          "[data-menu-submenu]",
          { autoAlpha: 0, x: 8 },
          { autoAlpha: 1, x: 0, duration: 0.18, ease: "power2.out" },
        );
      });
    },
    { dependencies: [submenu], scope: rootRef },
  );

  function close() {
    setOpen(false);
    setSubmenu(false);
  }

  function submit(action: (formData: FormData) => void | Promise<void>, build?: (form: FormData) => void, confirmation?: string) {
    const form = new FormData();
    form.set("workoutId", workout.id);
    build?.(form);
    startTransition(async () => {
      await action(form);
      close();
      setCopyOpen(false);
      setConfirmOpen(false);
      if (confirmation) setToast(confirmation);
    });
  }

  const hidden = workout.hiddenFromClient;

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => (open ? close() : setOpen(true))}
        aria-label={t("moreActions")}
        title={t("moreActions")}
        aria-haspopup="menu"
        aria-expanded={open}
        className={cn(buttonQuiet, open && "bg-cream/8 text-cream")}
      >
        <Icon name="more" className="h-4 w-4" strokeWidth={2.4} />
      </button>

      {open && (
        <div
          data-menu-panel
          role="menu"
          className={cn(
            surface,
            "absolute top-full right-0 z-30 mt-2 w-[min(17rem,calc(100vw-2rem))] p-2 shadow-xl",
          )}
        >
          <div className="relative flex flex-col">
            <MenuItem
              icon="copy"
              label={t("copy")}
              submenu
              disabled={pending}
              onClick={() => setSubmenu((value) => !value)}
            />

            <MenuItem
              icon={hidden ? "eye" : "eyeOff"}
              label={hidden ? t("unhideFromClient") : t("hideFromClient")}
              hint={hidden ? t("unhideFromClientHint") : t("hideFromClientHint")}
              disabled={pending}
              onClick={() => submit(hideAction, (form) => form.set("hidden", hidden ? "0" : "1"))}
            />

            <div className="my-1 border-t border-cream/10" />

            <MenuItem
              icon="trash"
              label={t("deleteWorkout")}
              danger
              disabled={pending}
              onClick={() => {
                close();
                setConfirmOpen(true);
              }}
            />

            {submenu && (
              <div
                data-menu-submenu
                role="menu"
                className={cn(
                  surface,
                  // Flies out to the left on a phone, where there is no room to
                  // the right of a row that already reaches the screen edge.
                  "absolute top-0 right-full z-40 mr-2 w-[min(15rem,calc(100vw-2rem))] p-2 shadow-xl",
                  "sm:right-full",
                )}
              >
                <MenuItem
                  icon="copy"
                  label={t("copyToLibrary")}
                  disabled={pending}
                  onClick={() => {
                    close();
                    setDestination("master");
                    setCopyOpen(true);
                  }}
                />
              </div>
            )}
          </div>
        </div>
      )}

      <Modal
        open={copyOpen}
        onCloseAction={() => setCopyOpen(false)}
        title={t("copyDestinationTitle")}
        lead={t("copyDestinationLead", { name: workout.name })}
        width="30rem"
      >
        <div className="space-y-4">
          <div className="space-y-2" role="radiogroup" aria-label={t("copyDestinationTitle")}>
            {DESTINATIONS.map((value) => (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={destination === value}
                onClick={() => setDestination(value)}
                className={cn(
                  "flex w-full items-start gap-3 rounded-[1rem] p-4 text-left ring-1 transition-colors",
                  destination === value
                    ? "bg-caramel/12 ring-caramel/40"
                    : "bg-cream/5 ring-cream/10 hover:bg-cream/8",
                )}
              >
                <span
                  aria-hidden
                  className={cn(
                    "mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full ring-1",
                    destination === value ? "ring-accent-ink" : "ring-cream/30",
                  )}
                >
                  {destination === value && (
                    <span className="h-2 w-2 rounded-full bg-accent-ink" />
                  )}
                </span>
                <span className="min-w-0">
                  <span className="block font-sans text-sm font-semibold text-cream">
                    {t(`library.${value}`)}
                  </span>
                  <span className={cn(muted, "mt-0.5 block text-xs")}>
                    {t(`library.${value}Hint`)}
                  </span>
                </span>
              </button>
            ))}
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setCopyOpen(false)}
              className={cn(buttonGhost, "px-5 py-2.5 text-sm")}
            >
              {common("cancel")}
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() =>
                submit(
                  copyAction,
                  (form) => form.set("category", destination),
                  t(`copiedTo.${destination}`),
                )
              }
              className={cn(buttonGhost, "px-5 py-2.5 text-sm")}
            >
              {pending ? common("saving") : t("copy")}
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        open={confirmOpen}
        onCloseAction={() => setConfirmOpen(false)}
        title={t("removeWorkout")}
        lead={t("removeWorkoutConfirm", { name: workout.name })}
        width="26rem"
      >
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={() => setConfirmOpen(false)}
            className={cn(buttonGhost, "px-5 py-2.5 text-sm")}
          >
            {common("cancel")}
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => submit(removeAction)}
            className={buttonDanger}
          >
            {pending ? common("saving") : t("deleteWorkout")}
          </button>
        </div>
      </Modal>

      <Toast message={toast} onDoneAction={() => setToast(null)} />
    </div>
  );
}
