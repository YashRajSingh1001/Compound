import { Suspense } from "react";
import { CheckInFlow } from "@/components/CheckInFlow";
import { getToday, loadDay } from "@/lib/data";

// Groq calls (verdict, vocab words, quick add) can take 10–20 s; the default limit may be shorter.
export const maxDuration = 60;

export default function CheckInPage() {
  return (
    <Suspense fallback={<p className="text-muted">Loading your day…</p>}>
      <CheckIn />
    </Suspense>
  );
}

async function CheckIn() {
  const day = await loadDay(await getToday());
  return (
    <div className="mx-auto w-full max-w-2xl">
      <CheckInFlow day={day} />
    </div>
  );
}
