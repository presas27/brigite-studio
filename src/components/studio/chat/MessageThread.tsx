import type { Message } from "@/lib/studio/types";
import { chip } from "@/components/studio/theme";
import { cn } from "@/lib/utils";
import { groupThread } from "./group";

/**
 * Renders a chronological thread as day separators plus bubbles grouped by
 * consecutive author — the author label and timestamp sit once per run, not
 * once per message, so a burst of quick replies reads as one block.
 */
export function MessageThread({
  messages,
  meId,
  meLabel,
  otherLabel,
  locale,
}: {
  messages: Message[];
  /** The signed-in viewer's own user id — decides which side a bubble sits on. */
  meId: string;
  meLabel: string;
  otherLabel: string;
  locale: string;
}) {
  const entries = groupThread(messages);
  // Anchored to Europe/Lisbon to match `dayKey`/`weekKey` in `lib/studio/db.ts`,
  // so a message logged just after midnight never lands on the wrong day.
  const dayFormatter = new Intl.DateTimeFormat(locale, {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "Europe/Lisbon",
  });
  const timeFormatter = new Intl.DateTimeFormat(locale, {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Lisbon",
  });

  return (
    <div className="space-y-4">
      {entries.map((entry) => {
        if (entry.kind === "day") {
          return (
            <div key={`day-${entry.key}`} className="flex justify-center py-1">
              <span className={cn(chip, "text-[0.65rem] uppercase tracking-[0.08em] text-cream/45")}>
                {dayFormatter.format(entry.date)}
              </span>
            </div>
          );
        }

        const mine = entry.group.authorId === meId;
        const last = entry.group.messages[entry.group.messages.length - 1];
        return (
          <div
            key={entry.group.messages[0].id}
            className={cn("flex flex-col gap-1", mine ? "items-end" : "items-start")}
          >
            <span className="px-1 font-sans text-xs text-cream/45">{mine ? meLabel : otherLabel}</span>
            {entry.group.messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  "max-w-[85%] rounded-[1.1rem] px-4 py-2.5 sm:max-w-[70%]",
                  mine ? "bg-butter text-ink" : "bg-ink-lift text-cream ring-1 ring-cream/10",
                )}
              >
                <p className="whitespace-pre-wrap font-sans text-sm leading-relaxed">{message.body}</p>
              </div>
            ))}
            <span className="px-1 font-mono text-[0.65rem] text-cream/35">
              {timeFormatter.format(new Date(last.createdAt))}
            </span>
          </div>
        );
      })}
    </div>
  );
}
