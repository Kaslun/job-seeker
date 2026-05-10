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
    .in("status", ["applied", "interested"])
    .order("applied_at", { ascending: false, nullsFirst: false })
    .order("discovered_at", { ascending: false });

  const jobs = (data as Job[]) || [];
  const applied = jobs.filter((j) => j.status === "applied");
  const interested = jobs.filter((j) => j.status === "interested");

  return (
    <div style={{ minHeight: "100vh", background: "var(--paper)" }}>
      <TopNav />
      <div style={{ padding: "32px 60px 60px", maxWidth: 1080, margin: "0 auto" }}>
        <div className="row between end" style={{ marginBottom: 24 }}>
          <div>
            <div className="eyebrow" style={{ marginBottom: 6 }}>
              {applied.length} applied · {interested.length} interested
            </div>
            <h1 className="h1">
              Where you <span className="draw-u">are</span>.
            </h1>
          </div>
        </div>

        {interested.length > 0 && (
          <section style={{ marginBottom: 36 }}>
            <h2 className="h2" style={{ fontSize: 22, marginBottom: 16 }}>Interested</h2>
            <JobList jobs={interested} mode="interested" />
          </section>
        )}

        <section>
          <h2 className="h2" style={{ fontSize: 22, marginBottom: 16 }}>Applied</h2>
          {applied.length === 0 ? (
            <div className="card p-5 muted">No applications yet.</div>
          ) : (
            <JobList jobs={applied} mode="applied" />
          )}
        </section>
      </div>
    </div>
  );
}

function JobList({ jobs, mode }: { jobs: Job[]; mode: "interested" | "applied" }) {
  return (
    <div className="col gap-2">
      {jobs.map((j) => (
        <Link
          key={j.id}
          href={`/job/${j.id}`}
          className="card p-4"
          style={{ display: "block", textDecoration: "none", color: "inherit", cursor: "pointer", transition: "transform .15s, box-shadow .15s" }}
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
            <div className="col" style={{ alignItems: "flex-end", gap: 8, flex: "0 0 auto" }}>
              {mode === "applied" && j.applied_at ? (
                <span className="mono dim" style={{ fontSize: 11 }}>
                  applied {new Date(j.applied_at).toLocaleDateString()}
                </span>
              ) : (
                j.fit_score != null && (
                  <span className="mono" style={{ fontSize: 11 }}>{j.fit_score}/10</span>
                )
              )}
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
