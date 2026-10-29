import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { IdeaCapture, IdeaCard } from "@/components/Ideas";
import type { Idea } from "@/lib/ideas";
import { createClient } from "@/lib/supabase/server";

const card = "rounded-3xl border border-line bg-card p-5";
// Categories get a stable colour from a small palette, by name.
const PALETTE = ["#6366f1", "#ec4899", "#14b8a6", "#c08a3e", "#22c55e", "#f97316", "#0ea5e9", "#a855f7"];
const colorFor = (name: string) => PALETTE[[...name].reduce((a, c) => a + c.charCodeAt(0), 0) % PALETTE.length];

const VIEWS = [
  { key: "active", label: "Active", match: (i: Idea) => i.status === "new" || i.status === "exploring" },
  { key: "parked", label: "Parked", match: (i: Idea) => i.status === "parked" },
  { key: "done", label: "Done", match: (i: Idea) => i.status === "done" },
  { key: "all", label: "All", match: () => true },
];

export default function IdeasPage({ searchParams }: PageProps<"/ideas">) {
  return (
    <Suspense fallback={<div className="h-64 animate-pulse rounded-3xl bg-chip" aria-label="Loading ideas" />}>
      <Ideas searchParams={searchParams} />
    </Suspense>
  );
}

async function Ideas({ searchParams }: { searchParams: PageProps<"/ideas">["searchParams"] }) {
  await connection();
  const params = await searchParams;
  const supabase = await createClient();
  const { data } = await supabase.from("ideas").select("*").order("created_at", { ascending: false });
  const ideas = (data ?? []) as Idea[];

  const view = VIEWS.find((v) => v.key === params.view) ?? VIEWS[0];
  const categories = [...new Set(ideas.map((i) => i.category).filter((c): c is string => Boolean(c)))].sort();
  const cat = typeof params.cat === "string" && categories.includes(params.cat) ? params.cat : null;
  const shown = ideas.filter(view.match).filter((i) => (cat ? i.category === cat : true));

  const href = (next: { view?: string; cat?: string | null }) => {
    const q = new URLSearchParams();
    const v = next.view ?? view.key;
    const c = next.cat === undefined ? cat : next.cat;
    if (v !== "active") q.set("view", v);
    if (c) q.set("cat", c);
    const qs = q.toString();
    return `/ideas${qs ? `?${qs}` : ""}`;
  };
  const pill = (active: boolean) =>
    `flex h-10 items-center gap-2 rounded-full border px-4 text-sm ${active ? "border-accent/60 bg-accent-soft text-accent" : "border-line bg-card"}`;

  return (
    <>
      <header className="flex flex-col gap-1">
        <span className="label">
          {ideas.filter(VIEWS[0].match).length} active · {categories.length} {categories.length === 1 ? "category" : "categories"}
        </span>
        <h1 className="font-serif text-5xl leading-none italic tracking-tight lg:text-6xl">Ideas</h1>
      </header>

      <section className={card}>
        <IdeaCapture />
      </section>

      <nav aria-label="Filter ideas" className="flex flex-wrap items-center gap-2">
        {VIEWS.map((v) => (
          <Link key={v.key} href={href({ view: v.key })} className={pill(v.key === view.key)}>
            {v.label} <span className="text-muted">{ideas.filter(v.match).length}</span>
          </Link>
        ))}
        {categories.length > 0 && <span className="mx-1 h-6 w-px bg-line" aria-hidden />}
        {categories.map((c) => (
          <Link key={c} href={href({ cat: cat === c ? null : c })} className={pill(cat === c)}>
            <span className="size-2 rounded-full" style={{ background: colorFor(c) }} />
            {c}
          </Link>
        ))}
      </nav>

      {shown.length ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {shown.map((idea) => (
            <IdeaCard key={idea.id} idea={idea} color={idea.category ? colorFor(idea.category) : undefined} />
          ))}
        </div>
      ) : (
        <p className="py-10 text-center text-muted">
          {ideas.length ? "Nothing here with these filters." : "No ideas yet. Write one above, or tell Claude: “save an idea: …”."}
        </p>
      )}
    </>
  );
}
