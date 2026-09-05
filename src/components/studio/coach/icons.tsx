"use client";

import type { ComponentType } from "react";
import type { AnimatedIconProps } from "@/components/ui/types";
import ArrowNarrowLeftIcon from "@/components/ui/arrow-narrow-left-icon";
import BatteryPauseIcon from "@/components/ui/battery-pause-icon";
import ChartBarIcon from "@/components/ui/chart-bar-icon";
import ChartLineIcon from "@/components/ui/chart-line-icon";
import ClockIcon from "@/components/ui/clock-icon";
import CopyIcon from "@/components/ui/copy-icon";
import DotsVerticalIcon from "@/components/ui/dots-vertical-icon";
import DownloadIcon from "@/components/ui/download-icon";
import EyeIcon from "@/components/ui/eye-icon";
import EyeOffIcon from "@/components/ui/eye-off-icon";
import FileDescriptionIcon from "@/components/ui/file-description-icon";
import FilledBellIcon from "@/components/ui/filled-bell-icon";
import FlameIcon from "@/components/ui/flame-icon";
import GearIcon from "@/components/ui/gear-icon";
import HistoryCircleIcon from "@/components/ui/history-circle-icon";
import LayersIcon from "@/components/ui/layers-icon";
import LayoutDashboardIcon from "@/components/ui/layout-dashboard-icon";
import LayoutSidebarRightCollapseIcon from "@/components/ui/layout-sidebar-right-collapse-icon";
import LayoutSidebarRightIcon from "@/components/ui/layout-sidebar-right-icon";
import LibraryIcon from "@/components/ui/library-icon";
import LogoutIcon from "@/components/ui/logout-icon";
import MagnifierIcon from "@/components/ui/magnifier-icon";
import MessageCircleIcon from "@/components/ui/message-circle-icon";
import PlayerIcon from "@/components/ui/player-icon";
import PlusIcon from "@/components/ui/plus-icon";
import RefreshIcon from "@/components/ui/refresh-icon";
import RightChevron from "@/components/ui/right-chevron";
import SendIcon from "@/components/ui/send-icon";
import SimpleCheckedIcon from "@/components/ui/simple-checked-icon";
import SlidersHorizontalIcon from "@/components/ui/sliders-horizontal-icon";
import Stack3Icon from "@/components/ui/stack-3-icon";
import TargetIcon from "@/components/ui/target-icon";
import TelephoneIcon from "@/components/ui/telephone-icon";
import TrashIcon from "@/components/ui/trash-icon";
import TriangleAlertIcon from "@/components/ui/triangle-alert-icon";
import UnorderedListIcon from "@/components/ui/unordered-list-icon";
import UsersGroupIcon from "@/components/ui/users-group-icon";
import XIcon from "@/components/ui/x-icon";
import { cn } from "@/lib/utils";

/**
 * The studio's icons, from Its Hover — each one plays a short motion on hover.
 *
 * Names stay the ones the app already uses (`overview`, `checkin`, …) so the
 * rail, the player and the rest don't have to know which Hover file sits
 * underneath. Size still comes from `className` (`h-4 w-4`); stroke is 1.6 to
 * match the weight the old set was drawn at.
 */
const ICONS = {
  overview: LayoutDashboardIcon,
  message: MessageCircleIcon,
  clients: UsersGroupIcon,
  calendar: ClockIcon,
  video: PlayerIcon,
  checkin: SimpleCheckedIcon,
  library: LibraryIcon,
  dumbbell: TargetIcon,
  bell: FilledBellIcon,
  alert: TriangleAlertIcon,
  print: FileDescriptionIcon,
  plus: PlusIcon,
  check: SimpleCheckedIcon,
  chevron: RightChevron,
  arrowLeft: ArrowNarrowLeftIcon,
  grip: DotsVerticalIcon,
  trash: TrashIcon,
  menu: UnorderedListIcon,
  panelLeftClose: LayoutSidebarRightCollapseIcon,
  panelLeftOpen: LayoutSidebarRightIcon,
  close: XIcon,
  play: PlayerIcon,
  pause: BatteryPauseIcon,
  settings: GearIcon,
  chart: ChartBarIcon,
  logout: LogoutIcon,
  search: MagnifierIcon,
  grid: Stack3Icon,
  list: UnorderedListIcon,
  trend: ChartLineIcon,
  ruler: SlidersHorizontalIcon,
  history: HistoryCircleIcon,
  clock: ClockIcon,
  flame: FlameIcon,
  more: DotsVerticalIcon,
  eye: EyeIcon,
  eyeOff: EyeOffIcon,
  copy: CopyIcon,
  program: LayersIcon,
  share: SendIcon,
  addToHome: DownloadIcon,
  phone: TelephoneIcon,
  swap: RefreshIcon,
} satisfies Record<string, ComponentType<AnimatedIconProps>>;

export type IconName = keyof typeof ICONS;

export function Icon({
  name,
  className,
  strokeWidth = 1.6,
}: {
  name: IconName;
  className?: string;
  /** Bump it when the glyph sits next to heavy display type and 1.6 reads thin. */
  strokeWidth?: number;
}) {
  const Glyph = ICONS[name];
  return (
    <Glyph
      strokeWidth={strokeWidth}
      className={cn("inline-block shrink-0", className)}
    />
  );
}
