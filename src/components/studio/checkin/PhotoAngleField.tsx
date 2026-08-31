"use client";

import { useRef, useState } from "react";
import { useMutation } from "convex/react";
import { useTranslations } from "next-intl";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { Icon } from "@/components/studio/coach/icons";
import { eyebrow } from "@/components/studio/theme";
import type { PhotoAngle, ProgressPhoto } from "@/lib/studio/types";
import { cn } from "@/lib/utils";
import { encodeVariants, MAX_SOURCE_BYTES } from "./photo-encode";

type State = "idle" | "working" | "failed";

/**
 * One angle of the week's progress photos.
 *
 * The upload does not wait for the check-in to be submitted. It cannot: the
 * bytes are in the browser, and holding them until submit means either keeping
 * a multi-megabyte blob in React state or uploading to storage and hoping the
 * client presses the button — the second leaks files nothing points at. So
 * picking a photo saves it, to this client and this week, and the row it writes
 * is what the log reads. Picking again replaces it, files and all.
 *
 * Straight to Convex from here, not through a server action: a Server Action
 * would carry the file to the Next server first and upload it from there, which
 * is the same bytes twice and a 4.5 MB body limit in the middle.
 */
export function PhotoAngleField({
  clientId,
  weekOf,
  angle,
  label,
  existing,
}: {
  clientId: string;
  weekOf: string;
  angle: PhotoAngle;
  label: string;
  existing: ProgressPhoto | undefined;
}) {
  const t = useTranslations("Studio.photos");
  const uploadUrl = useMutation(api.photos.uploadUrl);
  const savePhoto = useMutation(api.photos.savePhoto);
  const inputRef = useRef<HTMLInputElement>(null);
  const [state, setState] = useState<State>("idle");
  // The saved photo is served behind the session like any other; a just-picked
  // one is shown from its own blob, so the preview does not wait for a round
  // trip through storage.
  const [preview, setPreview] = useState<string | null>(null);
  const [saved, setSaved] = useState(existing != null);

  async function put(blob: Blob): Promise<Id<"_storage">> {
    const url = await uploadUrl({ clientId: clientId as Id<"users"> });
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": blob.type },
      body: blob,
    });
    if (!response.ok) throw new Error(`upload failed: ${response.status}`);
    const { storageId } = (await response.json()) as { storageId: Id<"_storage"> };
    return storageId;
  }

  async function pick(file: File) {
    if (file.size > MAX_SOURCE_BYTES) {
      setState("failed");
      return;
    }
    setState("working");
    try {
      const { full, thumb } = await encodeVariants(file);
      const [fileId, thumbId] = await Promise.all([put(full.blob), put(thumb.blob)]);
      await savePhoto({
        clientId: clientId as Id<"users">,
        weekOf,
        angle,
        fileId,
        thumbId,
        width: full.width,
        height: full.height,
        bytes: full.blob.size + thumb.blob.size,
      });
      setPreview((current) => {
        if (current) URL.revokeObjectURL(current);
        return URL.createObjectURL(full.blob);
      });
      setSaved(true);
      setState("idle");
    } catch {
      setState("failed");
    }
  }

  const source = preview ?? (existing ? `/app/api/foto/${existing.id}?v=thumb` : null);

  return (
    <div className="space-y-1.5">
      <p className={eyebrow}>{label}</p>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={state === "working"}
        aria-label={saved ? t("replace", { angle: label }) : t("add", { angle: label })}
        className={cn(
          "relative flex aspect-[3/4] w-full items-center justify-center overflow-hidden rounded-[1rem] bg-cream/[0.04] ring-1 transition-colors",
          state === "failed" ? "ring-silk/60" : "ring-cream/15 hover:ring-cream/35",
          state === "working" && "opacity-60",
        )}
      >
        {source ? (
          // Not `next/image`: the source is either a local blob URL or a
          // per-session route, and neither is something to run through the
          // image optimizer — the browser already has the exact size it needs.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={source} alt="" className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <span className="flex flex-col items-center gap-1.5 text-cream/40">
            <Icon name={state === "failed" ? "alert" : "plus"} className="h-5 w-5" />
            <span className="font-sans text-[0.7rem]">
              {state === "working" ? t("uploading") : state === "failed" ? t("failed") : t("optional")}
            </span>
          </span>
        )}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(event) => {
          const file = event.target.files?.[0];
          // Cleared so picking the same file twice still fires a change.
          event.target.value = "";
          if (file) void pick(file);
        }}
      />
    </div>
  );
}
