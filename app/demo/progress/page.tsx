import { Suspense } from "react";
import { ProgressView } from "@/components/ProgressView";
import { getToday } from "@/lib/data";
import { demoInput } from "@/lib/demo";
import { buildProgress } from "@/lib/progress-data";

export const metadata = { title: "Compound · demo progress" };

export default function DemoProgressPage() {
  return (
    <Suspense fallback={<div className="h-96 animate-pulse rounded-3xl bg-chip" />}>
      <DemoProgress />
    </Suspense>
  );
}

async function DemoProgress() {
  const reviews = Array.from({ length: 120 }, (_, i) => ({ correct: i % 5 !== 0 }));
  return <ProgressView data={buildProgress(demoInput(await getToday()), 0.58, reviews)} readOnly />;
}
