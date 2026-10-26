"use client";

import { useActionState } from "react";
import { signIn } from "./actions";

export default function LoginPage() {
  const [error, formAction, pending] = useActionState(signIn, null);

  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-6 px-4">
      <div>
        <span className="label">Daily tracker</span>
        <h1 className="font-serif text-6xl italic tracking-tight">Compound</h1>
        <p className="text-muted">Small daily wins that compound.</p>
      </div>
      <form action={formAction} className="flex flex-col gap-3">
        <input
          name="email"
          type="email"
          autoComplete="email"
          placeholder="Email"
          required
          className="rounded-full border border-line bg-card px-5 py-3 outline-none focus:border-accent"
        />
        <input
          name="password"
          type="password"
          autoComplete="current-password"
          placeholder="Password"
          required
          className="rounded-full border border-line bg-card px-5 py-3 outline-none focus:border-accent"
        />
        <button
          disabled={pending}
          className="rounded-full bg-accent px-4 py-3 font-semibold text-on-accent disabled:opacity-50"
        >
          {pending ? "Signing in…" : "Sign in"}
        </button>
        {error && <p className="text-sm text-bad">{error}</p>}
      </form>
    </main>
  );
}
