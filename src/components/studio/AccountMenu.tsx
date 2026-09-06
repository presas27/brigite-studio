"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { useTranslations } from "next-intl";
import { authClient } from "@/lib/auth-client";
import { Icon } from "@/components/studio/coach/icons";
import { MorphHeight } from "@/components/studio/MorphHeight";
import { cn } from "@/lib/utils";
async function signOut() {
  await authClient.signOut();
  window.location.assign("/app/entrar");
}

/**
 * The account chip in the top right, and everything that hangs off it: who is
 * signed in, a way into their own details, and sign-out.
 *
 * Sign-out used to sit at the bottom of the sidebar, which is where you put a
 * thing you never want found. It belongs next to the name.
 *
 * Closes on outside click and on Escape; the trigger keeps focus so keyboard
 * users are not dropped at the top of the document.
 */
export function AccountMenu({
  name,
  email,
  role,
  className,
}: {
  name: string;
  email: string;
  role: "coach" | "client";
  className?: string;
}) {
  const t = useTranslations("Studio.account");
  const [open, setOpen] = useState(false);
  const container = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: PointerEvent) {
      if (!container.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const itemClass =
    "flex w-full items-center gap-2.5 rounded-[0.7rem] px-3 py-2.5 text-left font-sans text-sm text-cream/75 transition-colors hover:bg-cream/6 hover:text-cream";

  return (
    <div ref={container} className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex items-center gap-2.5 rounded-full bg-cream/5 py-1.5 pr-2.5 pl-1.5 ring-1 ring-cream/12 transition-colors hover:bg-cream/8 hover:ring-cream/25"
      >
        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-accent-fill font-sans text-xs font-semibold text-ink">
          {name.trim().charAt(0).toUpperCase()}
        </span>
        <span className="hidden max-w-[10rem] truncate font-sans text-sm text-cream/85 sm:inline">
          {name}
        </span>
        <Icon
          name="chevron"
          className={cn(
            "h-3.5 w-3.5 shrink-0 text-cream/45 transition-transform duration-200",
            open ? "-rotate-90" : "rotate-90",
          )}
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            role="menu"
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className="absolute right-0 z-50 mt-2 w-64 origin-top-right overflow-hidden rounded-[1rem] bg-ink-lift ring-1 ring-cream/12 shadow-[0_24px_48px_-20px_rgba(18,17,20,0.65)]"
          >
            <MorphHeight appear fade={false} contentKey="menu">
            <div className="border-b border-cream/10 px-4 py-3.5">
              <p className="truncate font-sans text-sm font-semibold text-cream">{name}</p>
              <p className="mt-0.5 truncate font-sans text-xs text-cream/45">{email}</p>
              <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-caramel/15 px-2.5 py-0.5 font-sans text-[0.7rem] text-accent-ink ring-1 ring-caramel/25">
                {t(`role.${role}`)}
              </p>
            </div>

            <div className="p-1.5">
              <Link href="/app/conta" role="menuitem" onClick={() => setOpen(false)} className={itemClass}>
                <Icon name="settings" className="h-4 w-4 shrink-0" />
                {t("details")}
              </Link>

              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  void signOut();
                }}
                className={cn(itemClass, "text-silk hover:bg-silk/10 hover:text-silk")}
              >
                <Icon name="logout" className="h-4 w-4 shrink-0" />
                {t("signOut")}
              </button>
            </div>
            </MorphHeight>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
