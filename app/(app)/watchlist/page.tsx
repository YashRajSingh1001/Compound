import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { WatchAdd, WatchRow } from "@/components/Watchlist";
import { createClient } from "@/lib/supabase/server";
import { MOOD_LABEL, WATCH_MOODS, type WatchItem, type WatchMood } from "@/lib/watchlist";

const card = "rounded-3xl border border-line bg-card p-5";
const TIMES = [15, 30, 60, 120];

const formatTime = (m: number) => (m < 60 ? `${m} min` : `${m / 60} h`);

export default function WatchlistPage({ searchParams }: PageProps<"/watchlist">) {
  return (
    <Suspense fallback={<div className="h-64 animate-pulse rounded-3xl bg-chip" aria-label="Loading watchlist" />}>
      <Watchlist searchParams={searchParams} />
    </Suspense>
  );
}

async function Watchlist({ searchParams }: { searchParams: PageProps<"/watchlist">["searchParams"] }) {
  // Per-request page: the Supabase client reads the clock for its session.
  await connection();
  const params = await searchParams;
  const minutes = typeof params.min === "string" && TIMES.includes(Number(params.min)) ? Number(params.min) : null;
  const mood = typeof params.mood === "string" && WATCH_MOODS.includes(params.mood as WatchMood) ? (params.mood as WatchMood) : null;

  const supabase = await createClient();
  const { data } = await supabase.from("watchlist").select("*").order("added_at", { ascending: false });
  const items = (data ?? []) as WatchItem[];
  const open = items.filter((i) => i.status !== "done");
  const inbox = open.filter((i) => i.status === "inbox");
  const queued = open.filter((i) => i.status === "queued");
  const done = items.filter((i) => i.status === "done").slice(0, 10);

  // "I have 30 min and want something fun": fits the time and matches the mood.
  const filtering = minutes !== null || mood !== null;
  const picks = open
    .filter((i) => (mood ? i.mood === mood : true))
    .filter((i) => (minutes ? i.est_minutes !== null && i.est_minutes <= minutes : true))
    .sort((a, b) => (b.est_minutes ?? 0) - (a.est_minutes ?? 0));

  const href = (next: { min?: number | null; mood?: string | null }) => {
    const q = new URLSearchParams();
    const m = next.min === undefined ? minutes : next.min;
    const md = next.mood === undefined ? mood : next.mood;
    if (m) q.set("min", String(m));
    if (md) q.set("mood", md);
    const qs = q.toString();
    return `/watchlist${qs ? `?${qs}` : ""}`;
  };
  const pill = (active: boolean) =>
    `flex h-10 items-center rounded-full border px-4 text-sm ${active ? "border-accent/60 bg-accent-soft text-accent" : "border-line bg-card"}`;

  return (
    <>
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex flex-col gap-1">
          <span className="label">
            {open.length} to watch, read or hear · {inbox.length} in the inbox
          </span>
          <h1 className="font-serif text-5xl leading-none italic tracking-tight lg:text-6xl">Watchlist</h1>
        </div>
        <div className="w-full lg:max-w-xl">
          <WatchAdd />
        </div>
      </header>

      <section className={`${card} flex flex-col gap-4`}>
        <p className="font-serif text-2xl italic">
          I have <span className="text-accent">{minutes ? formatTime(minutes) : "some time"}</span> and want something{" "}
          <span className="text-accent">{mood ? MOOD_LABEL[mood].toLowerCase() : "good"}</span>.
        </p>
        <div className="flex flex-wrap gap-2">
          {TIMES.map((t) => (
            <Link key={t} href={href({ min: minutes === t ? null : t })} className={pill(minutes === t)}>
              {formatTime(t)}
            </Link>
          ))}
          <span className="mx-1 w-px self-stretch bg-line" aria-hidden />
          {WATCH_MOODS.map((m) => (
            <Link key={m} href={href({ mood: mood === m ? null : m })} className={pill(mood === m)}>
              {MOOD_LABEL[m]}
            </Link>
          ))}
          {filtering && (
            <Link href="/watchlist" className="flex h-10 items-center px-2 text-sm text-muted">
              Clear
            </Link>
          )}
        </div>
        {filtering && (
          <ul className="flex flex-col">
            {picks.length ? (
              picks.map((i) => <WatchRow key={i.id} item={i} />)
            ) : (
              <li className="py-3 text-sm text-muted">Nothing fits yet. Tag lengths and moods below and matches show up here.</li>
            )}
          </ul>
        )}
      </section>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <section className={`${card} flex flex-col gap-2 lg:col-span-6`}>
          <div className="flex items-baseline justify-between">
            <span className="label">Inbox · tag type and mood</span>
            <span className="text-sm text-muted">{inbox.length}</span>
          </div>
          <ul className="flex flex-col">
            {inbox.length ? inbox.map((i) => <WatchRow key={i.id} item={i} />) : <li className="py-3 text-sm text-muted">Inbox zero.</li>}
          </ul>
        </section>
        <section className={`${card} flex flex-col gap-2 lg:col-span-6`}>
          <div className="flex items-baseline justify-between">
            <span className="label">Queued</span>
            <span className="text-sm text-muted">{queued.length}</span>
          </div>
          <ul className="flex flex-col">
            {queued.length ? (
              queued.map((i) => <WatchRow key={i.id} item={i} />)
            ) : (
              <li className="py-3 text-sm text-muted">Items move here once they have a type and a mood.</li>
            )}
          </ul>
          {done.length > 0 && (
            <>
              <span className="label mt-4">Recently done</span>
              <ul className="flex flex-col">
                {done.map((i) => (
                  <WatchRow key={i.id} item={i} />
                ))}
              </ul>
            </>
          )}
        </section>
      </div>
    </>
  );
}
