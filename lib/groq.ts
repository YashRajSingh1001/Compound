import "server-only";

// Groq's chat endpoint speaks the OpenAI format, so a plain fetch is enough.
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
export const GROQ_MODEL = process.env.GROQ_MODEL ?? "openai/gpt-oss-120b";

type ChatOptions = { maxTokens?: number; temperature?: number; json?: boolean };

async function complete(system: string, user: string, { maxTokens = 800, temperature = 0.4, json = false }: ChatOptions) {
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
      temperature,
      // gpt-oss thinks before answering; thinking tokens count toward this cap.
      max_completion_tokens: maxTokens,
      reasoning_effort: "low",
      ...(json ? { response_format: { type: "json_object" } } : {}),
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

export function groqChat(system: string, user: string, maxTokens = 800): Promise<string> {
  return complete(system, user, { maxTokens });
}

/** Ask for a JSON object and parse it. Throws if the reply isn't one. */
export async function groqJSON<T>(system: string, user: string, options: Omit<ChatOptions, "json"> = {}): Promise<T> {
  // JSON mode refuses prompts that never mention "json".
  const text = await complete(`${system}\nRespond with a single valid json object.`, user, { ...options, json: true });
  const cleaned = text.replace(/^```(?:json)?|```$/gm, "").trim();
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("Groq's reply wasn't valid JSON");
    return JSON.parse(match[0]) as T;
  }
}
