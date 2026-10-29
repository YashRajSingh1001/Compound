import { Suspense } from "react";
import { AddVision, VisionCard } from "@/components/Vision";
import { getToday } from "@/lib/data";
import { loadVision } from "@/lib/vision-data";

export default function VisionPage() {
  return (
    <Suspense fallback={<div className="h-96 animate-pulse rounded-3xl bg-chip" aria-label="Loading vision board" />}>
      <Vision />
    </Suspense>
  );
}

async function Vision() {
  const today = await getToday();
  const { items, targets } = await loadVision(today);
  const open = items.filter((i) => !i.achieved_at).length;

  return (
    <>
      <header className="flex flex-col gap-1">
        <span className="label">
          {open} {open === 1 ? "goal" : "goals"} in sight · {items.length - open} achieved
        </span>
        <h1 className="font-serif text-5xl leading-none italic tracking-tight lg:text-6xl">Vision</h1>
        <p className="font-serif text-xl text-muted italic">See it every day. Then go do the work.</p>
      </header>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {items.map((item) => (
          <VisionCard key={item.id} item={item} today={today} targets={targets} />
        ))}
        <AddVision targets={targets} />
      </div>
    </>
  );
}
