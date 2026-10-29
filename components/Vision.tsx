"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addVisionItem, deleteVisionItem, setVisionAchieved, updateVisionItem } from "@/app/(app)/vision/actions";
import { daysBetween, formatDay } from "@/lib/dates";
import type { VisionCardData } from "@/lib/vision";
import { ProgressBar } from "./ui";

export type LinkableTarget = { id: string; name: string };

/** Phone photos are huge; shrink to 1600 px JPEG before upload. Falls back to the original. */
async function shrink(file: File): Promise<Blob> {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.85));
    return blob ?? file;
  } catch {
    return file;
  }
}

/** Sends the shrunk photo to the server, which stores it privately under your account. */
async function uploadPhoto(itemId: string, file: File): Promise<void> {
  const form = new FormData();
  form.append("itemId", itemId);
  form.append("photo", await shrink(file), "photo.jpg");
  const reply = await fetch("/api/vision-photo", { method: "POST", body: form });
  const data = (await reply.json().catch(() => ({}))) as { error?: string };
  if (!reply.ok) throw new Error(data.error ?? "Upload failed");
}

function countdown(date: string | null, today: string): string | null {
  if (!date) return null;
  const days = daysBetween(today, date);
  if (days < 0) return `${formatDay(date)} · passed`;
  if (days === 0) return "Today";
  return `${days} ${days === 1 ? "day" : "days"} · ${formatDay(date)}`;
}

const field = "min-h-11 w-full rounded-xl border border-line bg-background px-3 text-sm outline-none focus:border-accent";

function Fields({
  item,
  targets,
}: {
  item?: Partial<VisionCardData>;
  targets: LinkableTarget[];
}) {
  return (
    <>
      <label className="flex flex-col gap-1 text-xs text-muted">
        Goal
        <input name="title" required defaultValue={item?.title ?? ""} placeholder="5K followers on Instagram" className={field} />
      </label>
      <label className="flex flex-col gap-1 text-xs text-muted">
        Say it as if it&rsquo;s already true
        <input name="statement" defaultValue={item?.statement ?? ""} placeholder="I have 5,000 people following my work." className={field} />
      </label>
      <div className="grid grid-cols-2 gap-2">
        <label className="flex flex-col gap-1 text-xs text-muted">
          By
          <input name="target_date" type="date" defaultValue={item?.target_date ?? ""} className={field} />
        </label>
        <label className="flex flex-col gap-1 text-xs text-muted">
          Category
          <input name="category" defaultValue={item?.category ?? ""} placeholder="Content" className={field} />
        </label>
      </div>
      <label className="flex flex-col gap-1 text-xs text-muted">
        Show live progress from
        <select name="target_id" defaultValue={item?.target_id ?? ""} className={field}>
          <option value="">Nothing (no progress bar)</option>
          {targets.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      </label>
    </>
  );
}

const read = (form: FormData) => ({
  title: String(form.get("title") ?? ""),
  statement: String(form.get("statement") ?? ""),
  target_date: String(form.get("target_date") ?? "") || null,
  category: String(form.get("category") ?? ""),
  target_id: String(form.get("target_id") ?? "") || null,
});

/** "+ New goal" card at the end of the board. */
export function AddVision({ targets }: { targets: LinkableTarget[] }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex min-h-64 flex-col items-center justify-center gap-2 rounded-3xl border-2 border-dashed border-line text-muted transition hover:border-accent hover:text-accent"
      >
        <span className="text-4xl leading-none">+</span>
        <span className="font-medium">New goal</span>
      </button>
    );
  }
  return (
    <form
      action={(form) =>
        startTransition(async () => {
          const reply = await addVisionItem(read(form));
          if (reply.error) setError(reply.error);
          else setOpen(false);
        })
      }
      className="flex flex-col gap-3 rounded-3xl border border-line bg-card p-5"
    >
      <span className="label">New goal</span>
      <Fields targets={targets} />
      {error && <p className="text-sm text-bad">{error}</p>}
      <div className="flex gap-2">
        <button type="button" onClick={() => setOpen(false)} className="min-h-11 flex-1 rounded-full bg-chip text-sm font-medium">
          Cancel
        </button>
        <button disabled={pending} className="min-h-11 flex-[2] rounded-full bg-accent text-sm font-semibold text-on-accent disabled:opacity-60">
          {pending ? "Adding…" : "Add to board"}
        </button>
      </div>
      <span className="text-xs text-muted">Add a photo after saving.</span>
    </form>
  );
}

/** One goal as a big picture card: image, statement, countdown, live progress. */
export function VisionCard({ item, today, targets }: { item: VisionCardData; today: string; targets: LinkableTarget[] }) {
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const achieved = Boolean(item.achieved_at);
  const when = countdown(item.target_date, today);

  function onPhoto(file: File | undefined) {
    if (!file) return;
    setError(null);
    startTransition(async () => {
      try {
        await uploadPhoto(item.id, file);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Upload failed");
      }
    });
  }

  if (editing) {
    return (
      <form
        action={(form) =>
          startTransition(async () => {
            const url = String(form.get("image_url") ?? "").trim();
            const reply = await updateVisionItem(item.id, { ...read(form), ...(url ? { image_url: url } : {}) });
            if (reply.error) setError(reply.error);
            else setEditing(false);
          })
        }
        className="flex flex-col gap-3 rounded-3xl border border-line bg-card p-5"
      >
        <span className="label">Edit goal</span>
        <Fields item={item} targets={targets} />
        <label className="flex flex-col gap-1 text-xs text-muted">
          Or use a picture from the web (paste an image link)
          <input name="image_url" type="url" placeholder="https://…" className={field} />
        </label>
        {error && <p className="text-sm text-bad">{error}</p>}
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => startTransition(() => deleteVisionItem(item.id))}
            className="min-h-11 rounded-full px-4 text-sm font-medium text-bad"
          >
            Delete
          </button>
          <span className="flex-1" />
          <button type="button" onClick={() => setEditing(false)} className="min-h-11 rounded-full bg-chip px-5 text-sm font-medium">
            Cancel
          </button>
          <button disabled={pending} className="min-h-11 rounded-full bg-accent px-5 text-sm font-semibold text-on-accent disabled:opacity-60">
            Save
          </button>
        </div>
      </form>
    );
  }

  return (
    <article
      className={`group relative flex min-h-[26rem] flex-col justify-end overflow-hidden rounded-3xl border border-line bg-card ${
        pending ? "opacity-70" : ""
      }`}
    >
      {item.picture ? (
        // eslint-disable-next-line @next/next/no-img-element -- signed storage URLs change hourly; next/image adds nothing here
        <img src={item.picture} alt="" className={`absolute inset-0 size-full object-cover ${achieved ? "grayscale-[60%]" : ""}`} />
      ) : (
        <div
          className="absolute inset-0"
          style={{ background: "radial-gradient(circle at 30% 20%, color-mix(in srgb, var(--accent) 45%, transparent), var(--card) 70%)" }}
          aria-hidden
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-black/0" aria-hidden />

      <div className="absolute top-3 right-3 left-3 flex justify-between gap-2">
        {item.category ? (
          <span className="rounded-full bg-black/45 px-3 py-1 text-xs font-medium text-white backdrop-blur">{item.category}</span>
        ) : (
          <span />
        )}
        <div className="flex gap-1.5">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="rounded-full bg-black/45 px-3 py-1 text-xs font-medium text-white backdrop-blur hover:bg-black/60"
          >
            {item.picture ? "Change photo" : "Add photo"}
          </button>
          <button
            type="button"
            onClick={() => setEditing(true)}
            aria-label={`Edit ${item.title}`}
            className="rounded-full bg-black/45 px-3 py-1 text-xs font-medium text-white backdrop-blur hover:bg-black/60"
          >
            Edit
          </button>
        </div>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => onPhoto(e.target.files?.[0])} />
      </div>

      <div className="relative flex flex-col gap-2 p-5 text-white">
        {when && <span className="font-mono text-[11px] tracking-[0.14em] text-white/75 uppercase">{achieved ? "Achieved" : when}</span>}
        <h2 className={`font-serif text-3xl leading-tight ${achieved ? "line-through decoration-2" : ""}`}>{item.title}</h2>
        {item.statement && <p className="font-serif text-lg leading-snug text-white/90 italic">&ldquo;{item.statement}&rdquo;</p>}
        {item.progress && (
          <div className="flex flex-col gap-1.5 pt-1">
            <ProgressBar value={item.progress.done} max={item.progress.total} color="#d8b26e" />
            <span className="text-xs text-white/75">{item.progress.label}</span>
          </div>
        )}
        {error && <p className="text-sm text-red-300">{error}</p>}
        <button
          type="button"
          onClick={() => startTransition(() => setVisionAchieved(item.id, !achieved))}
          className={`mt-1 w-fit rounded-full px-4 py-1.5 text-xs font-semibold backdrop-blur ${
            achieved ? "bg-good text-card" : "bg-white/15 text-white hover:bg-white/25"
          }`}
        >
          {achieved ? "✓ Achieved" : "Mark achieved"}
        </button>
      </div>
    </article>
  );
}
