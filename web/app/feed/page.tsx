import { TopNav } from "@/components/top-nav";
import { getSupabase, type Job } from "@/lib/supabase";
import { FeedClient } from "./feed-client";

export const dynamic = "force-dynamic";

export default async function FeedPage() {
  const sb = getSupabase();
  const { data, error } = await sb
    .from("jobs")
    .select("*")
    .eq("status", "new")
    .order("fit_score", { ascending: false, nullsFirst: false })
    .order("discovered_at", { ascending: false })
    .limit(50);

  const jobs = (data as Job[]) || [];

  return (
    <div style={{ minHeight: "100vh", background: "var(--paper)" }}>
      <TopNav />
      <div style={{ padding: "32px 60px 60px", maxWidth: 920, margin: "0 auto" }}>
        <div className="row between" style={{ alignItems: "flex-end", marginBottom: 24 }}>
          <div>
            <div className="eyebrow" style={{ marginBottom: 6 }}>
              {todayLabel()}
            </div>
            <h1 className="h1">
              Today&apos;s <span className="draw-u">roles</span>.
            </h1>
          </div>
          <span className="kbd-hint">
            <kbd className="kbd">←</kbd> pass · <kbd className="kbd">→</kbd> save · <kbd className="kbd">↵</kbd> open
          </span>
        </div>

        {error && (
          <div className="card p-5" style={{ borderColor: "var(--rose-2)", color: "var(--rose-2)" }}>
            Error loading jobs: {error.message}
          </div>
        )}

        <FeedClient initialJobs={jobs} />
      </div>
    </div>
  );
}

function todayLabel() {
  const d = new Date();
  return d.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });
}
