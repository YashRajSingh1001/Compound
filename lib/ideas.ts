// Ideas: shared types and the prompt that tidies a raw idea (often a voice
// transcript) into title, category and "why it came up".

export const IDEA_STATUSES = ["new", "exploring", "parked", "done"] as const;
export type IdeaStatus = (typeof IDEA_STATUSES)[number];

export const STATUS_LABEL: Record<IdeaStatus, string> = { new: "New", exploring: "Exploring", parked: "Parked", done: "Done" };

export type Idea = {
  id: string;
  title: string;
  details: string | null;
  category: string | null;
  context: string | null;
  status: IdeaStatus;
  source: "app" | "chat";
  created_at: string;
};

export type StructuredIdea = { title: string; details: string | null; category: string | null; context: string | null };

export const IDEA_SYSTEM = `You file ideas for a personal idea log. The input is one idea, often a rambling voice transcript.
Return:
- title: the idea in at most 10 words, specific, no filler.
- details: the substance in the person's own words, cleaned of filler words and repetition. Keep every concrete detail. null if the title says it all.
- category: one short label (1–2 words, Title Case). Reuse one of "existing_categories" whenever it fits; otherwise create a sensible new one (e.g. Content, Project, Career, Business, Fitness, Learning, Life).
- context: why the idea came up or what it relates to, as a short phrase (e.g. "while editing the RAG reel", "from a chat with my manager", "for ReadKernel"). Look for phrases like "while…", "when…", "after…", "because…", "for my … project", "came to me during…". Move that phrase out of details into context. null only if the text gives no trigger at all; never invent one.

Shape: {"title": "", "details": null, "category": "", "context": null}`;

/** Fold Groq's reply into safe values; falls back to the raw text. */
export function cleanIdea(raw: string, reply: Partial<StructuredIdea> | null): StructuredIdea {
  const trim = (s: unknown, max: number) => (typeof s === "string" && s.trim() ? s.trim().slice(0, max) : null);
  return {
    title: trim(reply?.title, 140) ?? raw.trim().slice(0, 140),
    details: trim(reply?.details, 4000) ?? (raw.trim().length > 140 ? raw.trim().slice(0, 4000) : null),
    category: trim(reply?.category, 40),
    context: trim(reply?.context, 200),
  };
}
