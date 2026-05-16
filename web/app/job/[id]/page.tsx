import { Sidebar } from "@/components/sidebar";
import { getSupabase, type Job } from "@/lib/supabase";
import { CoverArt, Icon, MatchRing } from "@/components/visual";
import { extractTags, levelFromTitle, relativeTime } from "@/lib/derive";
import Link from "next/link";
import { notFound } from "next/navigation";
import { unstable_noStore as noStore } from "next/cache";
import { JobActions } from "./job-actions";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function JobPage({ params }: { params: { id: string } }) {
  noStore();
  const sb = getSupabase();
  const { data, error } = await sb.from("jobs").select("*").eq("id", params.id).single();
  if (error || !data) notFound();
  const job = data as Job;

  const tags = extractTags(job.jd_text, job.location, job.remote_type);
  const level = levelFromTitle(job.title);

  return (
    <div style={{ minHeight: "100vh", background: "var(--paper)" }}>
      <Sidebar />
      <div className="main-shifted">
        <div style={{ padding: "24px 60px 60px", maxWidth: 1080, margin: "0 auto" }}>
          <div className="row between" style={{ marginBottom: 18 }}>
            <Link href="/feed" className="row gap-2 mono dim" style={{ fontSize: 12 }}>← back to feed</Link>
            <span className="mono dim">{relativeTime(job.discovered_at)}</span>
          </div>

          <CoverArt
            company={job.company}
            title={job.title}
            style={{ width: "100%", aspectRatio: "21 / 9", marginBottom: 20, fontSize: 48 }}
          />

          <div className="row between start" style={{ marginBottom: 18, gap: 24 }}>
            <div className="grow">
              <div className="row gap-3" style={{ marginBottom: 8 }}>
                <span className="eyebrow">{job.company}</span>
                <span className="chip chip-outline" style={{ fontSize: 11 }}>{level}</span>
                {job.lang === "no" && <span className="chip chip-outline" style={{ fontSize: 11 }}>Norsk JD</span>}
              </div>
              <h1 className="h1">{job.title}</h1>
              <div className="row wrap gap-4" style={{ marginTop: 12, fontSize: 14, color: "var(--ink-2)" }}>
                {job.location && <span className="row gap-2"><Icon.pin /> {job.location}</span>}
                {job.salary_text && <span className="row gap-2"><Icon.cash /> {job.salary_text}</span>}
                {job.remote_type && <span className="row gap-2">{job.remote_type}</span>}
              </div>
            </div>
            {job.fit_score != null && <MatchRing score={job.fit_score} size={64} />}
          </div>

          {tags.length > 0 && (
            <div className="row wrap gap-2">
              {tags.map((t, i) => (
                <span key={i} className={"chip" + (i === 0 ? " chip-accent" : "")}>{t}</span>
              ))}
            </div>
          )}

          <hr className="divider" style={{ margin: "28px 0" }} />

          <div style={{ display: "grid", gridTemplateColumns: "1.7fr 1fr", gap: 36 }}>
            <div className="col" style={{ gap: 24 }}>
              {job.fit_rationale && (
                <div className="card p-5" style={{ background: "var(--accent-soft)", borderColor: "var(--accent-2)" }}>
                  <div className="eyebrow" style={{ marginBottom: 8 }}>Why this matched</div>
                  <p className="body" style={{ margin: 0, fontSize: 14 }}>{job.fit_rationale}</p>
                </div>
              )}
              <section>
                <h2 className="h2" style={{ marginBottom: 12 }}>The role</h2>
                <div className="body" style={{ color: "var(--ink-2)", whiteSpace: "pre-wrap" }}>
                  {job.jd_text || "(No description was scraped for this listing.)"}
                </div>
              </section>
            </div>

            <aside className="col" style={{ gap: 16, position: "sticky", top: 24, alignSelf: "flex-start" }}>
              <JobActions job={job} />
            </aside>
          </div>
        </div>
      </div>
    </div>
  );
}
