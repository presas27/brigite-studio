"use client";

import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import type { Message } from "@/lib/studio/types";
import { chip } from "@/components/studio/theme";
import { formatChatDay, formatChatTime } from "@/components/studio/format";
import { capitalize, cn } from "@/lib/utils";
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
  const scope = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      gsap.fromTo(
        "[data-message-bubble]",
        { autoAlpha: 0, scale: 0.94, y: 8 },
        {
          autoAlpha: 1,
          scale: 1,
          y: 0,
          duration: 0.28,
          stagger: 0.03,
          ease: "back.out(1.8)",
          overwrite: "auto",
        },
      );
    },
    { scope, dependencies: [messages.length] },
  );

  return (
    <div ref={scope} className="space-y-4">
      {entries.map((entry) => {
        if (entry.kind === "day") {
          return (
            <div key={`day-${entry.key}`} className="flex justify-center py-1">
              <span className={cn(chip, "text-[0.7rem] text-cream/45")}>
                {capitalize(formatChatDay(entry.date, locale), locale)}
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
                data-message-bubble
                className={cn(
                  "max-w-[85%] rounded-[1.1rem] px-4 py-2.5 sm:max-w-[70%]",
                  mine ? "bg-butter text-on-primary" : "bg-ink-lift text-cream ring-1 ring-cream/10",
                )}
              >
                <p className="whitespace-pre-wrap font-sans text-sm leading-relaxed">{message.body}</p>
              </div>
            ))}
            <span className="px-1 font-sans tabular-nums text-[0.65rem] text-cream/35">
              {formatChatTime(new Date(last.createdAt), locale)}
            </span>
          </div>
        );
      })}
    </div>
  );
}
