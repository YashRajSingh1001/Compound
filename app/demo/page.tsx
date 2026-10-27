import { Suspense } from "react";
import { TodayView } from "@/components/TodayView";
import { getToday } from "@/lib/data";
import { demoInput } from "@/lib/demo";
import { buildDay } from "@/lib/snapshot";

export const metadata = { title: "Compound · demo" };

export default function DemoTodayPage() {
  return (
    <Suspense fallback={<div className="h-96 animate-pulse rounded-3xl bg-chip" />}>
      <DemoToday />
    </Suspense>
  );
}

async function DemoToday() {
  const day = buildDay(demoInput(await getToday()));
  // One suggestion is enough to show the feature without taking over the page.
  return <TodayView day={{ ...day, suggestions: day.suggestions.slice(0, 1) }} demo />;
}
