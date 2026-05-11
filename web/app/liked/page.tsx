import { TopNav } from "@/components/top-nav";
import { getSupabase, type Job } from "@/lib/supabase";
import { JobList } from "@/components/job-list";

export const dynamic = "force-dynamic";

export default async function LikedPage() {
  const sb = getSupabase();
  const { data } = await sb
    .from("jobs")
    .select("*")
    .eq("status", "interested")
    .order("fit_score", { ascending: false, nullsFirst: false })
    .order("discovered_at", { ascending: false });

  const jobs = (data as Job[]) || [];

  return (
    <div style={{ minHeight: "100vh", background: "var(--paper)" }}>
      <TopNav />
      <div style={{ padding: "32px 60px 60px", maxWidth: 1080, margin: "0 auto" }}>
        <div className="row between end" style={{ marginBottom: 24 }}>
          <div>
            <div className="eyebrow" style={{ marginBottom: 6 }}>
              {jobs.length} role{jobs.length === 1 ? "" : "s"} saved
            </div>
            <h1 className="h1">
              Worth a <span className="draw-u">closer look</span>.
            </h1>
          </div>
        </div>

        {jobs.length === 0 ? (
          <div className="card p-8 center" style={{ flexDirection: "column", textAlign: "center", gap: 12 }}>
            <div className="h2" style={{ fontSize: 24 }}>Nothing here yet.</div>
            <p className="muted" style={{ maxWidth: 420 }}>
              When you mark a role as Interested from the feed, it shows up here. Skip the ones that don&apos;t fit. Save the ones that do.
            </p>
          </div>
        ) : (
          <JobList jobs={jobs} mode="liked" />
        )}
      </div>
    </div>
  );
}
