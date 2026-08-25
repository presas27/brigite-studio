import type { ClientAlert } from "@/lib/studio/clientConsole";
import type { IconName } from "@/components/studio/coach/icons";

/** Where each alert kind is resolved. One destination, no ambiguity. */
export function clientAlertHref(alert: ClientAlert): string {
  switch (alert.kind) {
    case "session":
    case "missed":
      return `/app/aluno/treino/${alert.assignmentId}`;
    case "checkin":
      return "/app/aluno/checkin";
    default:
      return "/app/aluno/mensagens";
  }
}

export const CLIENT_ALERT_ICON: Record<ClientAlert["kind"], IconName> = {
  session: "dumbbell",
  checkin: "checkin",
  message: "message",
  missed: "calendar",
};

/**
 * The alert's own sentence, in the aluna's second person.
 *
 * Kept here rather than inline in each consumer because the bell and the
 * landing screen show the same list, and two copies of this switch would drift
 * apart the first time a sentence is reworded.
 */
export function clientAlertLabel(
  alert: ClientAlert,
  t: (key: string, values?: Record<string, string | number>) => string,
  formatDate: (key: string) => string,
): string {
  switch (alert.kind) {
    case "session":
      return t("alert.session", { name: alert.name });
    case "checkin":
      return t("alert.checkin", { date: formatDate(alert.weekOf) });
    case "message":
      return t("alert.message", { count: alert.count });
    default:
      return t("alert.missed", { name: alert.name, date: formatDate(alert.date) });
  }
}

/** Stable key for a list row — an aluna can have two alerts of the same kind on the same day. */
export function clientAlertKey(alert: ClientAlert): string {
  return `${alert.kind}-${alert.at}-${
    alert.kind === "session" || alert.kind === "missed" ? alert.assignmentId : ""
  }`;
}
