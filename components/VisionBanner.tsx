import Link from "next/link";
import { daysBetween, formatDay } from "@/lib/dates";
import type { VisionCardData } from "@/lib/vision";

/** Today's rotating vision card: the picture, the statement, the countdown. */
export function VisionBanner({ item, today }: { item: VisionCardData; today: string }) {
  const days = item.target_date ? daysBetween(today, item.target_date) : null;
  return (
    <Link
      href="/vision"
      className="group relative flex min-h-44 flex-col justify-end overflow-hidden rounded-3xl border border-line bg-card"
    >
      {item.picture ? (
        // eslint-disable-next-line @next/next/no-img-element -- signed storage URLs change hourly
        <img src={item.picture} alt="" className="absolute inset-0 size-full object-cover transition duration-700 group-hover:scale-[1.03]" />
      ) : (
        <div
          className="absolute inset-0"
          style={{ background: "radial-gradient(circle at 25% 20%, color-mix(in srgb, var(--accent) 45%, transparent), var(--card) 70%)" }}
          aria-hidden
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/45 to-black/10" aria-hidden />
      <div className="relative flex flex-col gap-1.5 p-5 text-white">
        <span className="font-mono text-[11px] tracking-[0.14em] text-white/75 uppercase">
          Today&rsquo;s vision{days !== null && days >= 0 ? ` · ${days} days · ${formatDay(item.target_date!)}` : ""}
        </span>
        <span className="font-serif text-3xl leading-tight">{item.title}</span>
        {item.statement && <span className="max-w-xl font-serif text-lg text-white/90 italic">&ldquo;{item.statement}&rdquo;</span>}
      </div>
    </Link>
  );
}
