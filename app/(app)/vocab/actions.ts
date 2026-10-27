"use server";

import { refresh } from "next/cache";
import { addDays, isISODate } from "@/lib/dates";
import { groqJSON } from "@/lib/groq";
import { createClient } from "@/lib/supabase/server";
import type { GradeResult, VocabWord } from "@/lib/types";
import { GENERATE_SYSTEM, GRADE_SYSTEM, loadVocab, nextReview, vocabComplete } from "@/lib/vocab";

type Suggested = { groups?: { name?: string; words?: { word?: string; part_of_speech?: string; meaning?: string; example?: string }[] }[] };

// The prompt lists recent words to steer Groq away from them; the database's
// unique index catches anything older.
const RECENT_IN_PROMPT = 300;
// Ask for a few spares per group, since some may turn out to be repeats.
const SPARES = 3;

function assertDate(date: string) {
  if (!isISODate(date)) throw new Error(`Bad date: ${date}`);
}

/** Ticks the Vocab non-negotiable once today's words are in and reviews are done. */
async function syncVocabTick(date: string) {
  const state = await loadVocab(date);
  if (!state.target || !vocabComplete(state)) return;
  const supabase = await createClient();
  const { data } = await supabase.from("daily_logs").select("id").eq("target_id", state.target.id).eq("log_date", date).limit(1);
  if (!data?.length) {
    await supabase.from("daily_logs").insert({ target_id: state.target.id, log_date: date, value: 1, tag: "auto" });
  }
}

/** Picks today's words with Groq. Does nothing if they already exist. */
export async function generateTodaysWords(date: string): Promise<{ error?: string }> {
  assertDate(date);
  try {
    const state = await loadVocab(date);
    if (!state.groups.length) return { error: "No vocab target with word groups. Check the Vocab target's rules." };

    const supabase = await createClient();
    const { data: seen, error } = await supabase.from("vocab_words").select("word").order("learned_on", { ascending: false });
    if (error) throw new Error(error.message);
    const known = new Set((seen ?? []).map((w) => (w.word as string).toLowerCase().trim()));
    for (const w of state.today) known.add(w.word.toLowerCase());

    const rows: Omit<VocabWord, "id" | "times_tested" | "times_correct">[] = [];
    for (let attempt = 0; attempt < 2; attempt++) {
      const missing = state.groups
        .map((g) => ({ ...g, have: rows.filter((r) => r.category === g.name).length + state.today.filter((w) => w.category === g.name).length }))
        .filter((g) => g.have < g.count);
      if (!missing.length) break;

      const reply = await groqJSON<Suggested>(
        GENERATE_SYSTEM,
        JSON.stringify({
          groups: missing.map((g) => ({ name: g.name, count: g.count - g.have + SPARES, brief: g.brief })),
          already_learned: [...known].slice(0, RECENT_IN_PROMPT),
        }),
        { maxTokens: 4000, temperature: 0.9 },
      );

      for (const g of missing) {
        const suggested = reply.groups?.find((s) => s.name?.toLowerCase() === g.name.toLowerCase())?.words ?? [];
        for (const s of suggested) {
          const word = s.word?.trim();
          if (!word || !s.meaning || known.has(word.toLowerCase())) continue;
          if (rows.filter((r) => r.category === g.name).length >= g.count - g.have) break;
          known.add(word.toLowerCase());
          rows.push({
            word,
            meaning: s.meaning.trim(),
            example: s.example?.trim() || null,
            part_of_speech: s.part_of_speech?.trim() || null,
            category: g.name,
            learned_on: date,
            box: 1,
            next_review: addDays(date, 1),
          });
        }
      }
    }

    if (rows.length) {
      const { error: insertError } = await supabase.from("vocab_words").insert(rows);
      if (insertError) throw new Error(insertError.message);
    }
    await syncVocabTick(date);
    refresh();
    return rows.length || state.today.length ? {} : { error: "Groq didn't return usable words. Try again." };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Something went wrong" };
  }
}

/**
 * Grades typed meanings with Groq. In "daily" mode the Leitner boxes move;
 * "practice" (any date range) is logged but leaves the schedule alone.
 */
export async function gradeAnswers(
  date: string,
  answers: { wordId: string; answer: string }[],
  mode: "daily" | "practice",
): Promise<{ results?: GradeResult[]; error?: string }> {
  assertDate(date);
  if (!answers.length) return { results: [] };
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("vocab_words")
      .select("id, word, meaning, box, times_tested, times_correct")
      .in("id", answers.map((a) => a.wordId));
    if (error) throw new Error(error.message);
    const words = (data ?? []) as Pick<VocabWord, "id" | "word" | "meaning" | "box" | "times_tested" | "times_correct">[];

    // Blank answers are simply wrong; only real attempts go to Groq.
    const attempted = answers.filter((a) => a.answer.trim());
    const graded = new Map<string, { correct: boolean; feedback: string }>();
    if (attempted.length) {
      const reply = await groqJSON<{ results?: { id?: string; correct?: boolean; feedback?: string }[] }>(
        GRADE_SYSTEM,
        JSON.stringify({
          items: attempted.map((a) => {
            const w = words.find((x) => x.id === a.wordId)!;
            return { id: a.wordId, word: w.word, reference_meaning: w.meaning, answer: a.answer.trim().slice(0, 500) };
          }),
        }),
        { maxTokens: 2500, temperature: 0.1 },
      );
      for (const r of reply.results ?? []) {
        if (r.id) graded.set(r.id, { correct: Boolean(r.correct), feedback: r.feedback?.trim() ?? "" });
      }
    }

    const results: GradeResult[] = [];
    for (const a of answers) {
      const w = words.find((x) => x.id === a.wordId);
      if (!w) continue;
      const g = graded.get(a.wordId) ?? {
        correct: false,
        feedback: a.answer.trim() ? "Couldn't grade this one — counted as missed." : "Left blank — here's the meaning again.",
      };
      const boxAfter = mode === "daily" ? (g.correct ? Math.min(w.box + 1, 5) : 1) : w.box;
      if (mode === "daily") {
        const { error: updateError } = await supabase
          .from("vocab_words")
          .update({
            box: boxAfter,
            next_review: nextReview(boxAfter, date),
            times_tested: w.times_tested + 1,
            times_correct: w.times_correct + (g.correct ? 1 : 0),
          })
          .eq("id", w.id);
        if (updateError) throw new Error(updateError.message);
      }
      results.push({ wordId: w.id, correct: g.correct, feedback: g.feedback, boxAfter });
    }

    const { error: logError } = await supabase.from("vocab_reviews").insert(
      results.map((r) => ({
        word_id: r.wordId,
        reviewed_on: date,
        mode,
        answer: answers.find((a) => a.wordId === r.wordId)?.answer.trim() ?? "",
        correct: r.correct,
        feedback: r.feedback,
        box_before: words.find((w) => w.id === r.wordId)?.box,
        box_after: r.boxAfter,
      })),
    );
    if (logError) throw new Error(logError.message);

    if (mode === "daily") await syncVocabTick(date);
    refresh();
    return { results };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Something went wrong" };
  }
}
