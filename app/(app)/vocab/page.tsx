import { Suspense } from "react";
import { GenerateWords } from "@/components/vocab/GenerateWords";
import { RecallQuiz } from "@/components/vocab/RecallQuiz";
import { getToday } from "@/lib/data";
import { addDays, formatDay, isISODate } from "@/lib/dates";
import { createClient } from "@/lib/supabase/server";
import type { VocabWord } from "@/lib/types";
import { LEITNER_DAYS, loadVocab, vocabComplete } from "@/lib/vocab";

// Groq calls (verdict, vocab words, quick add) can take 10–20 s; the default limit may be shorter.
export const maxDuration = 60;

const card = "rounded-3xl border border-line bg-card p-5";

export default function VocabPage({ searchParams }: PageProps<"/vocab">) {
  return (
    <Suspense fallback={<div className="h-64 animate-pulse rounded-3xl bg-chip" aria-label="Loading vocab" />}>
      <Vocab searchParams={searchParams} />
    </Suspense>
  );
}

async function Vocab({ searchParams }: { searchParams: PageProps<"/vocab">["searchParams"] }) {
  const date = await getToday();
  const params = await searchParams;
  const state = await loadVocab(date);
  const done = vocabComplete(state);

  // Practice: any date range you pick, defaulting to the last 7 days.
  const from = typeof params.from === "string" && isISODate(params.from) ? params.from : null;
  const to = typeof params.to === "string" && isISODate(params.to) ? params.to : null;
  let practice: VocabWord[] = [];
  if (from && to) {
    const supabase = await createClient();
    const { data } = await supabase
      .from("vocab_words")
      .select("*")
      .gte("learned_on", from <= to ? from : to)
      .lte("learned_on", from <= to ? to : from)
      .order("learned_on");
    practice = (data ?? []) as VocabWord[];
  }

  return (
    <>
      <header className="flex items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <span className="label">{formatDay(date)} · {state.perDay} words a day</span>
          <h1 className="font-serif text-5xl leading-none italic tracking-tight lg:text-6xl">Vocab</h1>
        </div>
        <span
          className={`rounded-full px-3 py-1.5 text-sm font-medium ${done ? "bg-good-soft text-good" : "bg-chip text-muted"}`}
        >
          {done ? "✓ Done for today" : state.due.length ? `${state.due.length} to review` : "Today's words to learn"}
        </span>
      </header>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <div className="flex flex-col gap-4 lg:col-span-7">
          {state.due.length > 0 && (
            <section className={`${card} flex flex-col gap-3`}>
              <div className="flex flex-col gap-1">
                <span className="label">Recall test</span>
                <p className="text-sm text-muted">
                  Write what each word means, in your own words. Groq checks the idea, not the exact wording.
                </p>
              </div>
              <RecallQuiz
                key={state.due.map((w) => w.id).join()}
                words={state.due.map(({ id, word, part_of_speech, meaning, box }) => ({ id, word, part_of_speech, meaning, box }))}
                date={date}
                mode="daily"
              />
            </section>
          )}

          <section className={`${card} flex flex-col gap-4`}>
            <div className="flex items-baseline justify-between">
              <span className="label">Today&rsquo;s words</span>
              <span className="text-sm text-muted">
                {state.today.length} / {state.perDay}
              </span>
            </div>
            {state.today.length < state.perDay && <GenerateWords date={date} perDay={state.perDay} />}
            {state.groups.map((group) => {
              const words = state.today.filter((w) => w.category === group.name);
              if (!words.length) return null;
              return (
                <div key={group.name} className="flex flex-col gap-3">
                  <h2 className="font-serif text-2xl">{group.name}</h2>
                  <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    {words.map((w) => (
                      <li key={w.id} className="flex flex-col gap-2 rounded-2xl border border-line p-4">
                        <div className="flex items-baseline gap-2">
                          <span className="font-serif text-[26px] leading-none">{w.word}</span>
                          {w.part_of_speech && <span className="text-xs text-muted italic">{w.part_of_speech}</span>}
                        </div>
                        <p className="text-[15px] leading-relaxed">{w.meaning}</p>
                        {w.example && <p className="border-t border-line pt-2 text-sm text-muted italic">&ldquo;{w.example}&rdquo;</p>}
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
            {state.today.length >= state.perDay && (
              <p className="text-sm text-muted">Tomorrow you&rsquo;ll get a recall test on these {state.today.length}.</p>
            )}
          </section>
        </div>

        <div className="flex flex-col gap-4 lg:col-span-5">
          <section className={`${card} grid grid-cols-3 gap-3`}>
            <Stat label="Words" value={String(state.total)} />
            <Stat label="Mastered" value={String(state.mastered)} />
            <Stat label="Accuracy" value={state.accuracy === null ? "—" : `${Math.round(state.accuracy * 100)}%`} />
          </section>

          <section className={`${card} flex flex-col gap-3`}>
            <span className="label">Practice any dates</span>
            <form className="flex flex-wrap items-end gap-2">
              <label className="flex flex-1 flex-col gap-1 text-xs text-muted">
                From
                <input
                  type="date"
                  name="from"
                  defaultValue={from ?? addDays(date, -7)}
                  max={date}
                  className="min-h-11 rounded-xl border border-line bg-background px-3 text-sm text-foreground"
                />
              </label>
              <label className="flex flex-1 flex-col gap-1 text-xs text-muted">
                To
                <input
                  type="date"
                  name="to"
                  defaultValue={to ?? date}
                  max={date}
                  className="min-h-11 rounded-xl border border-line bg-background px-3 text-sm text-foreground"
                />
              </label>
              <button className="min-h-11 rounded-full bg-accent-soft px-5 text-sm font-semibold text-accent">Test me</button>
            </form>
            {from && to &&
              (practice.length ? (
                <RecallQuiz
                  key={`${from}-${to}`}
                  words={practice.map(({ id, word, part_of_speech, meaning, box }) => ({ id, word, part_of_speech, meaning, box }))}
                  date={date}
                  mode="practice"
                />
              ) : (
                <p className="text-sm text-muted">No words learned between {formatDay(from)} and {formatDay(to)}.</p>
              ))}
          </section>

          <section className={`${card} flex flex-col gap-2 text-sm text-muted`}>
            <span className="label">How reviews work</span>
            <p>
              Every word starts in box 1. Get it right and it moves up a box and comes back later; miss it and it drops to box 1
              and returns tomorrow.
            </p>
            <div className="mt-1 grid grid-cols-5 gap-2 text-center">
              {LEITNER_DAYS.map((days, i) => (
                <div key={days} className="rounded-xl bg-chip px-1 py-2">
                  <div className="font-serif text-lg text-foreground">Box {i + 1}</div>
                  <div className="text-xs">{days === 1 ? "next day" : `${days} days`}</div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="label !text-[10px]">{label}</span>
      <span className="font-serif text-4xl leading-none">{value}</span>
    </div>
  );
}
