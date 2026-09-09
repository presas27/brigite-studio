"use client";

import type { ComponentType } from "react";
import {
  type IconsaxProps,
  IconsaxCategory,
  IconsaxMessageText,
  IconsaxProfile2User,
  IconsaxCalendar,
  IconsaxVideoPlay,
  IconsaxClipboardText,
  IconsaxBook,
  IconsaxWeight,
  IconsaxDumbbell,
  IconsaxLifter,
  IconsaxNotification,
  IconsaxDanger,
  IconsaxPrinter,
  IconsaxAdd,
  IconsaxTickCircle,
  IconsaxArrowRight4,
  IconsaxArrowLeft3,
  Iconsax3DotsMore,
  IconsaxTrash,
  IconsaxMenu,
  IconsaxSidebarLeft,
  IconsaxSidebarRight,
  IconsaxCloseX,
  IconsaxPlay,
  IconsaxPause,
  IconsaxSetting,
  IconsaxStatusUp,
  IconsaxLogout,
  IconsaxSearchNormal,
  IconsaxGrid,
  IconsaxTextAlignLeft,
  IconsaxTrendUp,
  IconsaxSliderHorizontal,
  IconsaxRotateLeft,
  IconsaxClock,
  IconsaxFlash,
  IconsaxMore,
  IconsaxEye,
  IconsaxEyeSlash,
  IconsaxCopy,
  IconsaxLayer,
  IconsaxSend,
  IconsaxImportArrow,
  IconsaxCall,
  IconsaxRepeatArrow,
} from "@/components/ui/iconsax";
import { cn } from "@/lib/utils";

/**
 * The studio's icon system, powered by Iconsax (https://app.iconsax.io).
 * Pure React SVG implementation (linear rounded):
 * - 100% SSR safe (Next.js server & client components)
 * - Zero external runtime fetches
 * - Fully reactive to Tailwind CSS (size, color, strokeWidth)
 * - Authentic geometry directly from the official Iconsax catalog
 *
 * Names stay the ones the app already uses (`overview`, `checkin`, `squat`, …)
 * so the rail, dock, player and lists work seamlessly.
 */
const ICONS = {
  overview: IconsaxCategory,
  message: IconsaxMessageText,
  clients: IconsaxProfile2User,
  calendar: IconsaxCalendar,
  video: IconsaxVideoPlay,
  checkin: IconsaxClipboardText,
  library: IconsaxBook,
  dumbbell: IconsaxDumbbell,
  squat: IconsaxDumbbell,
  barbell: IconsaxDumbbell,
  lifter: IconsaxLifter,
  weight: IconsaxWeight,
  bell: IconsaxNotification,
  alert: IconsaxDanger,
  print: IconsaxPrinter,
  plus: IconsaxAdd,
  check: IconsaxTickCircle,
  chevron: IconsaxArrowRight4,
  arrowLeft: IconsaxArrowLeft3,
  grip: Iconsax3DotsMore,
  trash: IconsaxTrash,
  menu: IconsaxMenu,
  panelLeftClose: IconsaxSidebarLeft,
  panelLeftOpen: IconsaxSidebarRight,
  close: IconsaxCloseX,
  play: IconsaxPlay,
  pause: IconsaxPause,
  settings: IconsaxSetting,
  chart: IconsaxStatusUp,
  logout: IconsaxLogout,
  search: IconsaxSearchNormal,
  grid: IconsaxGrid,
  list: IconsaxTextAlignLeft,
  trend: IconsaxTrendUp,
  ruler: IconsaxSliderHorizontal,
  history: IconsaxRotateLeft,
  clock: IconsaxClock,
  flame: IconsaxFlash,
  more: IconsaxMore,
  eye: IconsaxEye,
  eyeOff: IconsaxEyeSlash,
  copy: IconsaxCopy,
  program: IconsaxLayer,
  share: IconsaxSend,
  addToHome: IconsaxImportArrow,
  phone: IconsaxCall,
  swap: IconsaxRepeatArrow,
} satisfies Record<string, ComponentType<IconsaxProps>>;

export type IconName = keyof typeof ICONS;

export function Icon({
  name,
  className,
  strokeWidth = 1.5,
}: {
  name: IconName;
  className?: string;
  /** Bump it when the glyph sits next to heavy display type and 1.5 reads thin. */
  strokeWidth?: number;
}) {
  const Glyph = ICONS[name];
  if (!Glyph) return null;
  return (
    <Glyph
      strokeWidth={strokeWidth}
      className={cn("inline-block shrink-0", className)}
    />
  );
}

export {
  ICONSAX_MAP,
  Iconsax,
  type IconsaxProps,
  type IconsaxIconName,
} from "@/components/ui/iconsax";
