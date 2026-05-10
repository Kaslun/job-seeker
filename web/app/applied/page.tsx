import { TopNav } from "@/components/top-nav";
import { getSupabase, type Job } from "@/lib/supabase";
import { StudioMark } from "@/components/visual";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function AppliedPage() {
  const sb = getSupabase();
  const { data } = await sb
    .from("jobs")
    .select("*")
    .in("status", ["applied", "interested", "screen", "rejected", "withdrawn", "offer", "ghosted"])
    .order("applied_at", { ascending: false, nullsFirst: false })
    .order("discovered_at", { ascending: false });

  const jobs = (data as Job[]) || [];
  const interested = jobs.filter((j) => j.status === "interested");
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

        {interested.length > 0 && (
          <section style={{ marginBottom: 36 }}>
            <h2 className="h2" style={{ fontSize: 22, marginBottom: 16 }}>Interested (not yet applied)</h2>
            <JobList jobs={interested} mode="interested" />
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

const STATUS_LABELS: Record<string, string> = {
  applied: "Applied",
  screen: "In screen",
  interested: "Interested",
  offer: "Offer",
  rejected: "Rejected",
  withdrawn: "Withdrew",
  ghosted: "Ghosted",
};

function JobList({ jobs, mode }: { jobs: Job[]; mode: "interested" | "applied" | "closed" }) {
  return (
    <div className="col gap-2">
      {jobs.map((j) => (
        <Link
          key={j.id}
          href={`/job/${j.id}`}
          className="card p-4"
          style={{
            display: "block",
            textDecoration: "none",
            color: "inherit",
            cursor: "pointer",
            transition: "transform .15s, box-shadow .15s",
            opacity: mode === "closed" ? 0.6 : 1,
          }}
        >
          <div className="row between gap-4">
            <div className="row gap-3 grow" style={{ minWidth: 0 }}>
              <StudioMark company={j.company} size={48} />
              <div style={{ minWidth: 0 }}>
                <div className="eyebrow" style={{ fontSize: 10 }}>{j.company}</div>
                <div className="h3" style={{ fontSize: 18, marginBottom: 2 }}>{j.title}</div>
                {j.location && (
                  <div className="mono dim" style={{ fontSize: 11 }}>{j.location}</div>
                )}
              </div>
            </div>
            <div className="col" style={{ alignItems: "flex-end", gap: 6, flex: "0 0 auto" }}>
              <span
                className={
                  "pill " +
                  (j.status === "offer"
                    ? "pill-sage"
                    : j.status === "rejected" || j.status === "ghosted"
                    ? "pill-rose"
                    : j.status === "screen"
                    ? "pill-amber"
                    : "pill-ghost")
                }
              >
                {STATUS_LABELS[j.status] || j.status}
              </span>
              {j.applied_at && (
                <span className="mono dim" style={{ fontSize: 11 }}>
                  {new Date(j.applied_at).toLocaleDateString()}
                </span>
              )}
              {!j.applied_at && j.fit_score != null && (
                <span className="mono" style={{ fontSize: 11 }}>{j.fit_score}/10</span>
              )}
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
