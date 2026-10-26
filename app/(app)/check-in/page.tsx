import { Suspense } from "react";
import { CheckInFlow } from "@/components/CheckInFlow";
import { getToday, loadDay } from "@/lib/data";

export default function CheckInPage() {
  return (
    <Suspense fallback={<p className="text-muted">Loading your day…</p>}>
      <CheckIn />
    </Suspense>
  );
}

async function CheckIn() {
  const day = await loadDay(await getToday());
  return <CheckInFlow day={day} />;
}
