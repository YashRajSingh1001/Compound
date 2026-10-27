import Link from "next/link";
import { Suspense } from "react";
import { JournalEditor } from "@/components/JournalEditor";
import { getToday } from "@/lib/data";
import { addDays, formatDay, isISODate } from "@/lib/dates";
import { createClient } from "@/lib/supabase/server";

const card = "rounded-3xl border border-line bg-card p-5";

export default function JournalPage({ searchParams }: PageProps<"/journal">) {
  return (
    <Suspense fallback={<div className="h-96 animate-pulse rounded-3xl bg-chip" aria-label="Loading journal" />}>
      <Journal searchParams={searchParams} />
    </Suspense>
  );
}

async function Journal({ searchParams }: { searchParams: PageProps<"/journal">["searchParams"] }) {
  const [today, params] = await Promise.all([getToday(), searchParams]);
  const asked = typeof params.date === "string" && isISODate(params.date) && params.date <= today ? params.date : today;

  const supabase = await createClient();
  const [{ data: entry }, { data: past }] = await Promise.all([
    supabase.from("journal_entries").select("text, updated_at").eq("entry_date", asked).maybeSingle(),
    supabase
      .from("journal_entries")
      .select("entry_date, text")
      .gte("entry_date", addDays(today, -90))
      .order("entry_date", { ascending: false }),
  ]);
  const entries = (past ?? []) as { entry_date: string; text: string }[];
  const written = new Set(entries.map((e) => e.entry_date));
  // Last 14 days as quick links, written ones marked.
  const recentDays = Array.from({ length: 14 }, (_, i) => addDays(today, -i));

  return (
    <>
      <header className="flex flex-col gap-1">
        <span className="label">{asked === today ? `Today · ${formatDay(today)}` : formatDay(asked)}</span>
        <h1 className="font-serif text-5xl leading-none italic tracking-tight lg:text-6xl">Journal</h1>
      </header>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <section className={`${card} lg:col-span-8`}>
          <JournalEditor key={asked} date={asked} initial={(entry?.text as string | undefined) ?? ""} isToday={asked === today} />
        </section>

        <aside className="flex flex-col gap-4 lg:col-span-4">
          <section className={`${card} flex flex-col gap-3`}>
            <span className="label">Last 14 days</span>
            <div className="grid grid-cols-7 gap-1.5">
              {recentDays
                .slice()
                .reverse()
                .map((d) => (
                  <Link
                    key={d}
                    href={d === today ? "/journal" : `/journal?date=${d}`}
                    title={`${formatDay(d)}${written.has(d) ? " · written" : ""}`}
                    className={`flex aspect-square flex-col items-center justify-center rounded-xl text-xs ${
                      d === asked ? "bg-accent text-on-accent" : written.has(d) ? "bg-good-soft text-good" : "bg-chip text-muted"
                    }`}
                  >
                    <span className="font-serif text-base leading-none">{Number(d.slice(8))}</span>
                  </Link>
                ))}
            </div>
            <span className="text-xs text-muted">
              {recentDays.filter((d) => written.has(d)).length} of 14 days written · tap a day to read or edit it
            </span>
          </section>

          <section className={`${card} flex flex-col gap-1`}>
            <span className="label mb-2">Past entries</span>
            {entries.filter((e) => e.entry_date !== asked).length === 0 && (
              <p className="text-sm text-muted">Your entries will collect here.</p>
            )}
            {entries
              .filter((e) => e.entry_date !== asked)
              .slice(0, 20)
              .map((e) => (
                <Link
                  key={e.entry_date}
                  href={e.entry_date === today ? "/journal" : `/journal?date=${e.entry_date}`}
                  className="flex flex-col gap-0.5 border-t border-line py-3 hover:text-accent"
                >
                  <span className="text-xs text-muted">
                    {formatDay(e.entry_date)} · {e.text.trim().split(/\s+/).length} words
                  </span>
                  <span className="line-clamp-2 font-serif text-[17px] leading-snug">{e.text}</span>
                </Link>
              ))}
          </section>
        </aside>
      </div>
    </>
  );
}
