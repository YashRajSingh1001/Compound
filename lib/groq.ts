import "server-only";

// Groq's chat endpoint speaks the OpenAI format, so a plain fetch is enough.
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
export const GROQ_MODEL = process.env.GROQ_MODEL ?? "openai/gpt-oss-120b";

export async function groqChat(system: string, user: string, maxTokens = 800): Promise<string> {
  const key = process.env.GROQ_API_KEY;
  if (!key) throw new Error("GROQ_API_KEY is not set");

  const response = await fetch(GROQ_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      temperature: 0.4,
      // gpt-oss thinks before answering; thinking tokens count toward this cap.
      max_completion_tokens: maxTokens,
      reasoning_effort: "low",
    }),
  });

  if (!response.ok) {
    const detail = (await response.text()).slice(0, 300);
    throw new Error(response.status === 429 ? "Groq rate limit hit — try again in a minute." : `Groq error ${response.status}: ${detail}`);
  }

  const data = await response.json();
  const text: string | undefined = data.choices?.[0]?.message?.content;
  if (!text?.trim()) throw new Error("Groq returned an empty answer");
  return text.trim();
}
