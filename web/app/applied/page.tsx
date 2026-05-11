import { TopNav } from "@/components/top-nav";
import { getSupabase, type Job } from "@/lib/supabase";
import { JobList } from "@/components/job-list";

export const dynamic = "force-dynamic";

export default async function AppliedPage() {
  const sb = getSupabase();
  const { data } = await sb
    .from("jobs")
    .select("*")
    .in("status", ["applied", "screen", "rejected", "withdrawn", "offer", "ghosted"])
    .order("applied_at", { ascending: false, nullsFirst: false })
    .order("discovered_at", { ascending: false });

  const jobs = (data as Job[]) || [];
  const inProgress = jobs.filter((j) => j.status === "applied" || j.status === "screen");
  const offers = jobs.filter((j) => j.status === "offer");
  const closed = jobs.filter((j) => j.status === "rejected" || j.status === "withdrawn" || j.status === "ghosted");

  return (
    <div style={{ minHeight: "100vh", background: "var(--paper)" }}>
      <TopNav />
      <div style={{ padding: "32px 60px 60px", maxWidth: 1080, margin: "0 auto" }}>
        <div className="row between end" style={{ marginBottom: 24 }}>
          <div>
            <div className="eyebrow" style={{ marginBottom: 6 }}>
              {inProgress.length} in flight · {offers.length} offer{offers.length === 1 ? "" : "s"} · {closed.length} closed
            </div>
            <h1 className="h1">
              Where you <span className="draw-u">are</span>.
            </h1>
          </div>
        </div>

        {offers.length > 0 && (
          <section style={{ marginBottom: 36 }}>
            <h2 className="h2" style={{ fontSize: 22, marginBottom: 16 }}>Offers</h2>
            <JobList jobs={offers} mode="applied" />
          </section>
        )}

        <section style={{ marginBottom: 36 }}>
          <h2 className="h2" style={{ fontSize: 22, marginBottom: 16 }}>In flight</h2>
          {inProgress.length === 0 ? (
            <div className="card p-5 muted">No applications in progress.</div>
          ) : (
            <JobList jobs={inProgress} mode="applied" />
          )}
        </section>

        {closed.length > 0 && (
          <section>
            <h2 className="h2" style={{ fontSize: 22, marginBottom: 16, color: "var(--ink-2)" }}>Closed</h2>
            <JobList jobs={closed} mode="closed" />
          </section>
        )}
      </div>
    </div>
  );
}
