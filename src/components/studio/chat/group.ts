import type { Message } from "@/lib/studio/types";

export type MessageGroup = { authorId: string; messages: Message[] };

export type ThreadEntry =
  | { kind: "day"; key: string; date: Date }
  | { kind: "group"; group: MessageGroup };

/**
 * Split a chronological thread into day separators and runs of consecutive
 * messages from the same author — the shape a chat UI actually renders (one
 * label and one timestamp per run, not per message).
 */
export function groupThread(messages: Message[]): ThreadEntry[] {
  const entries: ThreadEntry[] = [];
  let lastDayKey: string | null = null;
  let currentGroup: MessageGroup | null = null;

  for (const message of messages) {
    const date = new Date(message.createdAt);
    const dayKey = date.toDateString();
    if (dayKey !== lastDayKey) {
      entries.push({ kind: "day", key: dayKey, date });
      lastDayKey = dayKey;
      currentGroup = null; // force a fresh author group after a day boundary
    }
    if (currentGroup && currentGroup.authorId === message.authorId) {
      currentGroup.messages.push(message);
    } else {
      currentGroup = { authorId: message.authorId, messages: [message] };
      entries.push({ kind: "group", group: currentGroup });
    }
  }
  return entries;
}
