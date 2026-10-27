import "server-only";

// Daily vocab: Groq picks new words (never a repeat), you type meanings the
// next day, Groq grades them, and a Leitner box decides when each word
// comes back.

import { addDays } from "./dates";
import { createClient } from "./supabase/server";
import type { Target, VocabGroup, VocabWord } from "./types";

// Days until the next review for a word in box 1…5. Get it right and it
// moves up a box (longer gap); miss it and it drops back to box 1.
export const LEITNER_DAYS = [1, 3, 7, 14, 30];

export function nextReview(box: number, date: string): string {
  return addDays(date, LEITNER_DAYS[Math.min(Math.max(box, 1), 5) - 1]);
}

const WORD_COLUMNS =
  "id, word, meaning, example, part_of_speech, category, learned_on, box, next_review, times_tested, times_correct";

export type VocabState = {
  target: Target | null;
  groups: VocabGroup[];
  perDay: number;
  today: VocabWord[];
  /** Words whose review date has come (learned before today). */
  due: VocabWord[];
  reviewedToday: number;
  total: number;
  mastered: number;
  accuracy: number | null;
};

export async function findVocabTarget(): Promise<Target | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("targets").select("*").eq("kind", "daily").eq("active", true);
  if (error) throw new Error(error.message);
  return ((data ?? []) as Target[]).find((t) => t.rules?.vocab?.groups?.length) ?? null;
}

export async function loadVocab(date: string): Promise<VocabState> {
  const supabase = await createClient();
  const [target, today, due, reviews, totals] = await Promise.all([
    findVocabTarget(),
    supabase.from("vocab_words").select(WORD_COLUMNS).eq("learned_on", date).order("created_at"),
    supabase.from("vocab_words").select(WORD_COLUMNS).lte("next_review", date).lt("learned_on", date).order("next_review"),
    supabase.from("vocab_reviews").select("correct, reviewed_on, mode"),
    supabase.from("vocab_words").select("box"),
  ]);
  for (const r of [today, due, reviews, totals]) if (r.error) throw new Error(r.error.message);

  const groups = target?.rules.vocab?.groups ?? [];
  // Practice is optional and often half-blank, so accuracy only counts daily recall tests.
  const allReviews = ((reviews.data ?? []) as { correct: boolean; reviewed_on: string; mode: string }[]).filter(
    (r) => r.mode === "daily",
  );
  const boxes = (totals.data ?? []) as { box: number }[];
  return {
    target,
    groups,
    perDay: groups.reduce((a, g) => a + g.count, 0),
    today: (today.data ?? []) as VocabWord[],
    due: (due.data ?? []) as VocabWord[],
    reviewedToday: allReviews.filter((r) => r.reviewed_on === date).length,
    total: boxes.length,
    mastered: boxes.filter((b) => b.box >= 5).length,
    accuracy: allReviews.length ? allReviews.filter((r) => r.correct).length / allReviews.length : null,
  };
}

/** Vocab counts as done once today's words exist and nothing is left to review. */
export function vocabComplete(state: VocabState): boolean {
  return state.perDay > 0 && state.today.length >= state.perDay && state.due.length === 0;
}

// ---------------------------------------------------------------------------
// Prompts
// ---------------------------------------------------------------------------

export const GENERATE_SYSTEM = `You are the vocabulary coach inside a personal learning app.
The learner is a data scientist in India, fluent in English, who wants to sound sharper at work and in interviews.

For each group you are given, suggest the requested number of words or terms that fit the group's brief.
- Pick words worth knowing at an advanced (C1–C2) level: skip anything a fluent professional already uses daily (e.g. "concise", "articulate", "mitigate", "data pipeline"), and skip obscure trivia nobody uses.
- Vary them: different sub-topics and parts of speech; no near-duplicates of each other.
- Never suggest anything in "already_learned".
- meaning: a plain-English definition in at most 25 words, the way a good teacher would explain it.
- example: one natural sentence using the word, set at work or in everyday life.
- part_of_speech: noun, verb, adjective, adverb, or phrase.

Shape: {"groups": [{"name": "<group name>", "words": [{"word": "", "part_of_speech": "", "meaning": "", "example": ""}]}]}`;

export const GRADE_SYSTEM = `You grade a vocabulary recall test. For each item you get the word, its reference meaning, and the learner's answer in their own words.
- correct = true when the answer captures the core meaning, even loosely, briefly, or with different wording. Ignore spelling and grammar.
- correct = false when the meaning is wrong, missing, or too vague to show understanding (e.g. "something technical").
- feedback: at most 20 words, warm and specific. If wrong, state the key idea they missed. If right, add one useful nuance.

Shape: {"results": [{"id": "<item id>", "correct": true, "feedback": ""}]}`;
