"use client";

import dynamic from "next/dynamic";

export const MetricChart = dynamic(() =>
  import("./MetricChartCanvas").then((mod) => mod.MetricChart),
);
