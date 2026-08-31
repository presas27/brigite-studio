"use client";

import { useTranslations } from "next-intl";
import { ErrorPanel } from "@/components/ErrorPanel";

/**
 * The coach area's own boundary. It sits below `CoachLayout`, so a screen that
 * throws — a builder action the deployment rejected, a read that timed out —
 * takes the main column with it and leaves the sidebar, the topbar and the
 * studio's theme exactly where they were. Losing the whole chrome to one failed
 * mutation is how an app starts feeling unsafe to use.
 */
export default function CoachError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("Error");

  return (
    <ErrorPanel
      title={t("title")}
      lead={t("lead")}
      retryLabel={t("retry")}
      onRetryAction={reset}
      href="/app/coach"
      hrefLabel={t("studio")}
      reference={error.digest ? t("reference", { digest: error.digest }) : undefined}
      className="min-h-[50dvh] px-0 py-6"
    />
  );
}
