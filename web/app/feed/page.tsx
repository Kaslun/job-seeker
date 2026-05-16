import { Sidebar } from "@/components/sidebar";
import { getSupabase, type Job } from "@/lib/supabase";
import { getAllProfiles } from "@/lib/profile";
import { FeedClient } from "./feed-client";
import { unstable_noStore as noStore } from "next/cache";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function FeedPage() {
  noStore();
  const sb = getSupabase();
  const [profiles, jobsResp] = await Promise.all([
    getAllProfiles(),
    sb
      .from("jobs")
      .select("*")
      .eq("status", "new")
      .order("fit_score", { ascending: false, nullsFirst: false })
      .order("discovered_at", { ascending: false })
      .limit(100),
  ]);
  const jobs = (jobsResp.data as Job[]) || [];

  return (
    <div style={{ minHeight: "100vh", background: "var(--paper)" }}>
      <Sidebar />
      <div className="main-shifted">
        <div style={{ padding: "32px 60px 60px", maxWidth: 920, margin: "0 auto" }}>
          <div className="row between" style={{ alignItems: "flex-end", marginBottom: 18 }}>
            <div>
              <div className="eyebrow" style={{ marginBottom: 6 }}>{todayLabel()}</div>
              <h1 className="h1">
                Today&apos;s <span className="draw-u">roles</span>.
              </h1>
            </div>
            <span className="kbd-hint">
              <kbd className="kbd">←</kbd> pass · <kbd className="kbd">→</kbd> save · <kbd className="kbd">↵</kbd> open
            </span>
          </div>

          {jobsResp.error && (
            <div className="card p-5" style={{ borderColor: "var(--rose-2)", color: "var(--rose-2)" }}>
              Error loading jobs: {jobsResp.error.message}
            </div>
          )}

          <FeedClient initialJobs={jobs} profiles={profiles} />
        </div>
      </div>
    </div>
  );
}

function todayLabel() {
  return new Date().toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });
}
