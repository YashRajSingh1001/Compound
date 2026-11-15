import { Suspense } from "react";
import { CheckInFlow } from "@/components/CheckInFlow";
import { getToday, loadDay } from "@/lib/data";
import { pickDay } from "@/lib/dates";

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
  const day = await loadDay(pickDay(params.date, today));
  return (
    <div className="mx-auto w-full max-w-2xl">
      <CheckInFlow day={day} past={day.date < today} />
    </div>
  );
}
