"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { useTranslations } from "next-intl";
import { Icon, type IconName } from "./coach/icons";
import { Modal } from "./Modal";
import { buttonOnAccent, buttonPrimary, eyebrowOnAccent, heading, muted, mutedOnAccent, surfaceAccent } from "./theme";
import { cn } from "@/lib/utils";

/**
 * "Put this on your phone." — the card that sells installing the app, and the
 * two ways of doing it:
 *
 * - Android and desktop Chrome fire `beforeinstallprompt`. We hold on to it
 *   and the button calls `prompt()` — the browser then asks the person, and
 *   the app lands on the home screen with no further steps.
 * - iOS has no such event and no way for a page to trigger installation; the
 *   only path is Safari's own Share → "Add to Home Screen". So there the
 *   button opens a short tutorial in a modal instead of pretending.
 *
 * Also registers the service worker, which is part of what makes the app
 * installable and which caches nothing (`public/sw.js`). Hidden once the app
 * is already running from the home screen, and on browsers that offer neither
 * path — a button that does nothing is worse than none.
 */

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function isInstallPromptEvent(event: Event): event is InstallPromptEvent {
  return "prompt" in event && typeof event.prompt === "function";
}

type Platform = "server" | "standalone" | "ios" | "other";

/** Read once on the client; the server render says nothing until then. */
function platform(): Platform {
  const nav = window.navigator as Navigator & { standalone?: boolean };
  if (window.matchMedia("(display-mode: standalone)").matches || nav.standalone === true) {
    return "standalone";
  }
  const ua = navigator.userAgent;
  // iPadOS reports as a Mac; the touch points tell it apart.
  const ios = /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
  return ios ? "ios" : "other";
}

function subscribeNever(): () => void {
  return () => {};
}

const IOS_STEPS: { key: "share" | "add" | "confirm"; icon: IconName }[] = [
  { key: "share", icon: "share" },
  { key: "add", icon: "addToHome" },
  { key: "confirm", icon: "check" },
];

export function InstallApp({ className }: { className?: string }) {
  const t = useTranslations("Studio.install");
  const where = useSyncExternalStore(subscribeNever, platform, () => "server" as const);
  const [prompt, setPrompt] = useState<InstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [tutorialOpen, setTutorialOpen] = useState(false);

  useEffect(() => {
    if (where === "server" || where === "standalone") return;
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    }

    function onPrompt(event: Event) {
      if (!isInstallPromptEvent(event)) return;
      event.preventDefault();
      setPrompt(event);
    }
    function onInstalled() {
      setInstalled(true);
    }
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, [where]);

  if (where === "server" || where === "standalone") return null;

  if (installed) {
    return <p className={cn(muted, className)}>{t("installed")}</p>;
  }

  if (!prompt && where !== "ios") return null;

  return (
    <div className={className}>
      {/* The one accent surface on the sign-in card: this is the thing we
          most want tapped after the sign-in button itself. */}
      <div className={cn(surfaceAccent, "p-5")}>
        <div className="relative flex items-start gap-4">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-on-dark/12 ring-1 ring-on-dark/25">
            <Icon name="phone" className="h-5 w-5 text-on-dark" />
          </span>
          <div className="min-w-0">
            <p className={eyebrowOnAccent}>{t("eyebrow")}</p>
            <p className={cn(heading, "mt-1 text-[1.35rem] text-on-dark")}>{t("title")}</p>
            <p className={cn(mutedOnAccent, "mt-1")}>{t("lead")}</p>
          </div>
        </div>
        <button
          type="button"
          className={cn(buttonOnAccent, "relative mt-4 w-full")}
          onClick={async () => {
            if (!prompt) {
              setTutorialOpen(true);
              return;
            }
            await prompt.prompt();
            const { outcome } = await prompt.userChoice;
            if (outcome === "accepted") setInstalled(true);
            setPrompt(null);
          }}
        >
          <Icon name="plus" className="h-4 w-4" />
          {t("install")}
        </button>
      </div>

      <Modal
        open={tutorialOpen}
        onCloseAction={() => setTutorialOpen(false)}
        title={t("ios.title")}
        lead={t("ios.lead")}
        width="26rem"
      >
        <ol className="space-y-3">
          {IOS_STEPS.map((step, index) => (
            <li
              key={step.key}
              className="flex items-start gap-4 rounded-[1rem] bg-cream/5 p-4 ring-1 ring-cream/10"
            >
              <span className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-[0.8rem] bg-cream/8 ring-1 ring-cream/15">
                <Icon name={step.icon} className="h-5 w-5 text-cream" />
                <span className="absolute -left-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-butter font-sans text-[0.65rem] font-semibold text-on-primary">
                  {index + 1}
                </span>
              </span>
              <span className="min-w-0 pt-0.5">
                <span className="block font-sans text-sm font-semibold text-cream">
                  {t(`ios.${step.key}Title`)}
                </span>
                <span className={cn(muted, "mt-0.5 block")}>{t(`ios.${step.key}`)}</span>
              </span>
            </li>
          ))}
        </ol>
        <p className={cn(muted, "mt-4")}>{t("ios.after")}</p>
        <button
          type="button"
          className={cn(buttonPrimary, "mt-5 w-full")}
          onClick={() => setTutorialOpen(false)}
        >
          {t("ios.done")}
        </button>
      </Modal>
    </div>
  );
}
