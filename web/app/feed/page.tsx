import { SidebarShell } from "@/components/sidebar-shell";
import { getSupabase, type Job } from "@/lib/supabase";
import { getActiveProfile } from "@/lib/profile";
import { FeedClient } from "./feed-client";
import { unstable_noStore as noStore } from "next/cache";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function FeedPage() {
  noStore();
  const sb = getSupabase();
  const active = await getActiveProfile();

  let query = sb
    .from("jobs")
    .select("*")
    .eq("status", "new")
    .order("fit_score", { ascending: false, nullsFirst: false })
    .order("discovered_at", { ascending: false })
    .limit(50);

  if (active) {
    query = query.eq("profile_slug", active.slug);
  }

  const { data, error } = await query;
  const jobs = (data as Job[]) || [];

  return (
    <div style={{ minHeight: "100vh", background: "var(--paper)" }}>
      <SidebarShell />
      <div className="main-shifted">
        <div style={{ padding: "32px 60px 60px", maxWidth: 920, margin: "0 auto" }}>
          <div className="row between" style={{ alignItems: "flex-end", marginBottom: 24 }}>
            <div>
              <div className="eyebrow" style={{ marginBottom: 6 }}>
                {todayLabel()}{active && ` · ${active.name}`}
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
    </div>
  );
}

function todayLabel() {
  return new Date().toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });
}
