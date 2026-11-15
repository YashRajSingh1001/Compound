import { Suspense } from "react";
import { CheckInFlow } from "@/components/CheckInFlow";
import { getToday, loadDay } from "@/lib/data";
import { addDays, pickDay } from "@/lib/dates";

export const maxDuration = 60;

export default function CheckInPage({ searchParams }: PageProps<"/check-in">) {
  return (
    <Suspense fallback={<p className="text-muted">Loading your day…</p>}>
      <CheckIn searchParams={searchParams} />
    </Suspense>
  );
}

async function CheckIn({ searchParams }: { searchParams: PageProps<"/check-in">["searchParams"] }) {
  const [today, params] = await Promise.all([getToday(), searchParams]);
  const date = pickDay(params.date, today);
  const [day, current] = await Promise.all([loadDay(date), date === today ? null : loadDay(today)]);
  const from = addDays(today, -6);
  const recent = (current ?? day).heat.filter((d) => d.date >= from && d.date <= today);
  return (
    <div className="mx-auto w-full max-w-2xl">
      <CheckInFlow key={day.date} day={day} today={today} recent={recent} />
    </div>
  );
}
