"use client";

import dynamic from "next/dynamic";

/**
 * Recharts is the heaviest client library the app loads. Keep it off the
 * overview and session routes — Evolução and the coach's progress tab are
 * the only screens that draw a chart, so they are the only ones that pay.
 */
export const ProgressChart = dynamic(
  () => import("./ProgressChart").then((mod) => mod.ProgressChart),
  {
    ssr: false,
    loading: () => <div className="h-72 animate-pulse rounded-[1.25rem] bg-cream/[0.04] ring-1 ring-cream/10" />,
  },
);
