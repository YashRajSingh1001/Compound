import { createClient } from "@/lib/supabase/server";

// Voice dictation: the browser records a clip, this sends it to Groq's
// Whisper model and returns the text. Nothing is stored: the audio is
// forwarded once and dropped. Signed-in users only.
export const maxDuration = 60;

const GROQ_URL = "https://api.groq.com/openai/v1/audio/transcriptions";
const MODEL = process.env.GROQ_WHISPER_MODEL ?? "whisper-large-v3-turbo";
// Groq's free tier accepts files up to 25 MB; a few minutes of speech is far less.
const MAX_BYTES = 25 * 1024 * 1024;

// Groq infers the format from the file name, so match the extension to the type.
function extensionFor(type: string): string {
  if (type.includes("webm")) return "webm";
  if (type.includes("mp4") || type.includes("aac") || type.includes("m4a")) return "mp4";
  if (type.includes("ogg")) return "ogg";
  if (type.includes("wav")) return "wav";
  if (type.includes("mpeg") || type.includes("mp3")) return "mp3";
  return "webm";
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Sign in first" }, { status: 401 });

  const key = process.env.GROQ_API_KEY;
  if (!key) return Response.json({ error: "GROQ_API_KEY is not set" }, { status: 500 });

  const form = await request.formData().catch(() => null);
  const audio = form?.get("audio");
  if (!(audio instanceof Blob) || audio.size === 0) return Response.json({ error: "No audio received" }, { status: 400 });
  if (audio.size > MAX_BYTES) return Response.json({ error: "Recording is too long" }, { status: 413 });

  const body = new FormData();
  body.append("file", audio, `dictation.${extensionFor(audio.type)}`);
  body.append("model", MODEL);
  body.append("response_format", "json");
  body.append("temperature", "0");
  // Optional hint, e.g. the field's language or vocabulary.
  const hint = form?.get("prompt");
  if (typeof hint === "string" && hint.trim()) body.append("prompt", hint.slice(0, 400));

  const response = await fetch(GROQ_URL, { method: "POST", headers: { Authorization: `Bearer ${key}` }, body });
  if (!response.ok) {
    const detail = (await response.text()).slice(0, 200);
    const error = response.status === 429 ? "Groq rate limit hit. Try again in a minute." : `Transcription failed (${response.status}): ${detail}`;
    return Response.json({ error }, { status: 502 });
  }
  const data = (await response.json()) as { text?: string };
  return Response.json({ text: (data.text ?? "").trim() });
}
