import type { CoachAlert } from "@/lib/studio/types";
import type { IconName } from "./icons";

/** Where each alert kind is resolved. One destination, no ambiguity. */
export function alertHref(alert: CoachAlert): string {
  switch (alert.kind) {
    case "checkin":
      return `/app/coach/alunos/${alert.clientId}/checkins`;
    case "message":
      return `/app/coach/alunos/${alert.clientId}/mensagens`;
    default:
      return `/app/coach/alunos/${alert.clientId}`;
  }
}

export const ALERT_ICON: Record<CoachAlert["kind"], IconName> = {
  checkin: "checkin",
  message: "message",
  inactive: "chart",
  missed: "calendar",
};
