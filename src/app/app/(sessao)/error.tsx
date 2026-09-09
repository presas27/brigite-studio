"use client";

import { useTranslations } from "next-intl";
import { ErrorPanel } from "@/components/ErrorPanel";

/**
 * A failed session must not trap her on a branded dead end. The way out is
 * the workouts tab, where she can start again.
 */
export default function SessaoError({
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
      href="/app/aluno/treinos"
      hrefLabel={t("studio")}
      reference={error.digest ? t("reference", { digest: error.digest }) : undefined}
      className="min-h-[100dvh] px-5"
    />
  );
}
