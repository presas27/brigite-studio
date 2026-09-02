"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { useTranslations } from "next-intl";
import { buttonGhost, buttonQuiet, eyebrow, muted } from "./theme";

/**
 * "Put this on your phone."
 *
 * Two platforms, two answers, one component:
 *
 * - Android and desktop Chrome fire `beforeinstallprompt`. We hold on to it
 *   and the button calls `prompt()` — the browser then asks the person, and
 *   the app lands on the home screen with no further steps.
 * - iOS has no such event and no way for a page to trigger installation; the
 *   only path is Safari's own Share → "Add to Home Screen". So there the
 *   button opens the three steps instead of pretending.
 *
 * Also registers the service worker, which is part of what makes the app
 * installable and which caches nothing (`public/sw.js`). Hidden once the app
 * is already running from the home screen.
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

export function InstallApp({ className }: { className?: string }) {
  const t = useTranslations("Studio.install");
  const where = useSyncExternalStore(subscribeNever, platform, () => "server" as const);
  const [prompt, setPrompt] = useState<InstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [showSteps, setShowSteps] = useState(false);

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
    return <p className={`${muted} ${className ?? ""}`}>{t("installed")}</p>;
  }

  // No native prompt and not iOS: the browser has nothing to offer (or already
  // installed it), and a button that does nothing is worse than none.
  if (!prompt && where !== "ios") return null;

  return (
    <div className={className}>
      <p className={eyebrow}>{t("title")}</p>
      <p className={`mt-1 ${muted}`}>{t("lead")}</p>

      {prompt ? (
        <button
          type="button"
          className={`${buttonGhost} mt-3 w-full`}
          onClick={async () => {
            await prompt.prompt();
            const { outcome } = await prompt.userChoice;
            if (outcome === "accepted") setInstalled(true);
            setPrompt(null);
          }}
        >
          {t("install")}
        </button>
      ) : (
        <>
          <button
            type="button"
            className={`${buttonGhost} mt-3 w-full`}
            aria-expanded={showSteps}
            onClick={() => setShowSteps((open) => !open)}
          >
            {t("install")}
          </button>
          {showSteps && (
            <ol className="mt-3 space-y-2 rounded-[1rem] bg-cream/5 p-4 ring-1 ring-cream/10">
              {(["share", "add", "confirm"] as const).map((step, index) => (
                <li key={step} className="flex gap-3 font-sans text-sm text-cream/80">
                  <span className="font-semibold text-accent-ink">{index + 1}.</span>
                  <span>{t(`ios.${step}`)}</span>
                </li>
              ))}
              <li className="pt-1">
                <button type="button" className={buttonQuiet} onClick={() => setShowSteps(false)}>
                  {t("ios.close")}
                </button>
              </li>
            </ol>
          )}
        </>
      )}
    </div>
  );
}
