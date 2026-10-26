"use client";

import { useActionState } from "react";
import { signIn } from "./actions";

export default function LoginPage() {
  const [error, formAction, pending] = useActionState(signIn, null);

  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-6 px-4">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Compound</h1>
        <p className="text-zinc-500">Small daily wins that compound.</p>
      </div>
      <form action={formAction} className="flex flex-col gap-3">
        <input
          name="email"
          type="email"
          autoComplete="email"
          placeholder="Email"
          required
          className="rounded-xl border border-zinc-300 bg-transparent px-4 py-3 dark:border-zinc-700"
        />
        <input
          name="password"
          type="password"
          autoComplete="current-password"
          placeholder="Password"
          required
          className="rounded-xl border border-zinc-300 bg-transparent px-4 py-3 dark:border-zinc-700"
        />
        <button
          disabled={pending}
          className="rounded-xl bg-zinc-900 px-4 py-3 font-medium text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
        >
          {pending ? "Signing in…" : "Sign in"}
        </button>
        {error && <p className="text-sm text-red-600">{error}</p>}
      </form>
    </main>
  );
}
