"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";

// Longest single recording; long journal entries can be dictated in parts.
const MAX_SECONDS = 300;
// What the browser can record, best first (Chrome/Android: webm; iPhone Safari: mp4).
const TYPES = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg;codecs=opus"];

const noop = () => () => {};
const supported = () => typeof window !== "undefined" && "MediaRecorder" in window && !!navigator.mediaDevices?.getUserMedia;

type State = "idle" | "recording" | "transcribing";

/**
 * Mic button: tap to record, tap again to stop. The clip goes to Groq Whisper
 * (via /api/transcribe) and the text comes back through `onText`. Hidden in
 * browsers that can't record.
 */
export function DictateButton({
  onText,
  prompt,
  compact = false,
  label = "Dictate",
}: {
  onText: (text: string) => void;
  /** Optional hint for Whisper: expected words or language. */
  prompt?: string;
  compact?: boolean;
  label?: string;
}) {
  const canRecord = useSyncExternalStore(noop, supported, () => false);
  const [state, setState] = useState<State>("idle");
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const recorder = useRef<MediaRecorder | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  // Release the mic if the page goes away mid-recording.
  useEffect(
    () => () => {
      if (timer.current) clearInterval(timer.current);
      recorder.current?.stream.getTracks().forEach((t) => t.stop());
    },
    [],
  );

  if (!canRecord) return null;

  async function transcribe(blob: Blob) {
    setState("transcribing");
    try {
      const form = new FormData();
      form.append("audio", blob);
      if (prompt) form.append("prompt", prompt);
      const reply = await fetch("/api/transcribe", { method: "POST", body: form });
      const data = (await reply.json()) as { text?: string; error?: string };
      if (!reply.ok || data.error) throw new Error(data.error ?? "Transcription failed");
      if (data.text) onText(data.text);
      else setError("Didn't catch anything. Try again a little closer to the mic.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Transcription failed");
    } finally {
      setState("idle");
    }
  }

  async function start() {
    setError(null);
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setError("Microphone access was blocked. Allow it in your browser settings to dictate.");
      return;
    }
    const type = TYPES.find((t) => MediaRecorder.isTypeSupported(t));
    const rec = new MediaRecorder(stream, type ? { mimeType: type } : undefined);
    const chunks: Blob[] = [];
    rec.ondataavailable = (e) => {
      if (e.data.size) chunks.push(e.data);
    };
    rec.onstop = () => {
      stream.getTracks().forEach((t) => t.stop());
      if (timer.current) clearInterval(timer.current);
      const blob = new Blob(chunks, { type: rec.mimeType || type || "audio/webm" });
      if (blob.size > 0) void transcribe(blob);
      else setState("idle");
    };
    recorder.current = rec;
    rec.start();
    setSeconds(0);
    setState("recording");
    timer.current = setInterval(() => {
      setSeconds((s) => {
        if (s + 1 >= MAX_SECONDS && rec.state === "recording") rec.stop();
        return s + 1;
      });
    }, 1000);
  }

  function stop() {
    if (recorder.current?.state === "recording") recorder.current.stop();
  }

  const clock = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
  const busy = state === "transcribing";

  return (
    <span className="inline-flex flex-col items-start gap-1">
      <button
        type="button"
        onClick={state === "recording" ? stop : start}
        disabled={busy}
        aria-label={state === "recording" ? "Stop recording" : busy ? "Transcribing" : label}
        title={state === "idle" ? `${label} (voice is transcribed by Groq)` : undefined}
        className={`inline-flex shrink-0 items-center justify-center gap-2 rounded-full font-medium transition active:scale-95 disabled:opacity-70 ${
          compact ? "size-12" : "min-h-11 px-4 text-sm"
        } ${state === "recording" ? "bg-bad text-card" : "bg-chip text-foreground hover:bg-line"}`}
      >
        {state === "recording" ? (
          <>
            <span className="size-2.5 animate-pulse rounded-full bg-card" aria-hidden />
            {!compact && <span className="tabular-nums">{clock} · Stop</span>}
          </>
        ) : busy ? (
          <>
            <span className="size-4 animate-spin rounded-full border-2 border-muted border-t-foreground" aria-hidden />
            {!compact && "Transcribing…"}
          </>
        ) : (
          <>
            <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden>
              <rect x="9" y="3" width="6" height="11" rx="3" />
              <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
            </svg>
            {!compact && label}
          </>
        )}
      </button>
      {error && <span className="max-w-xs text-xs text-bad">{error}</span>}
    </span>
  );
}
