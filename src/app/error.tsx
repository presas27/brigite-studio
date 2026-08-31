"use client";

import { useTranslations } from "next-intl";
import { ErrorPanel } from "@/components/ErrorPanel";

/**
 * The app's error boundary: anything that throws below the root layout — a
 * Server Component that could not read, a Server Action a page fired and lost —
 * lands here instead of on the framework's white "This page couldn't load".
 *
 * `reset` re-renders the segment, which is the right first move: most of these
 * are one bad round trip, not a broken build. The site link is the way out when
 * it is not.
 */
export default function AppError({
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
      href="/"
      hrefLabel={t("home")}
      reference={error.digest ? t("reference", { digest: error.digest }) : undefined}
    />
  );
}
