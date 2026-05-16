import { Sidebar } from "@/components/sidebar";
import { getSupabase, type Job } from "@/lib/supabase";
import { getAllProfiles } from "@/lib/profile";
import { unstable_noStore as noStore } from "next/cache";
import Link from "next/link";
import { ProfileBadge } from "@/components/profile-filter";
import { StudioMark, Icon } from "@/components/visual";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const STALE_THRESHOLD_DAYS = 10;
const VERY_STALE_THRESHOLD_DAYS = 21;

export default async function DashboardPage() {
  noStore();
  const sb = getSupabase();
  const profiles = await getAllProfiles();

  // Pull everything in one batch; cheap and we slice in JS.
  const { data: allJobs } = await sb.from("jobs").select("*").order("discovered_at", { ascending: false });
  const jobs = (allJobs as Job[]) || [];

  const newJobs = jobs.filter((j) => j.status === "new");
  const liked = jobs.filter((j) => j.status === "interested");
  const inFlight = jobs.filter((j) => j.status === "applied" || j.status === "screen");
  const offers = jobs.filter((j) => j.status === "offer");

  // Stale: applied 10+ days ago, no movement to screen/rejected.
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;
  const stale = inFlight.filter((j) => {
    if (j.status !== "applied" || !j.applied_at) return false;
    const days = (now - new Date(j.applied_at).getTime()) / dayMs;
    return days >= STALE_THRESHOLD_DAYS;
  });

  // Top 3 unseen by fit score for the morning glance.
  const topNew = [...newJobs]
    .filter((j) => j.fit_score != null)
    .sort((a, b) => (b.fit_score ?? 0) - (a.fit_score ?? 0))
    .slice(0, 3);

  return (
    <div style={{ minHeight: "100vh", background: "var(--paper)" }}>
      <Sidebar />
      <div className="main-shifted">
        <div style={{ padding: "32px 60px 60px", maxWidth: 1080, margin: "0 auto" }}>
          <div style={{ marginBottom: 28 }}>
            <div className="eyebrow" style={{ marginBottom: 6 }}>{todayLabel()}</div>
            <h1 className="h1">
              {greeting()}, <span className="draw-u">Kasper</span>.
            </h1>
          </div>

          <div className="dash-grid">
            <Tile
              href="/feed"
              label="New today"
              value={newJobs.length}
              hint={newJobs.length > 0 ? "Triage these →" : "Empty — come back tomorrow"}
              tone="accent"
            />
            <Tile
              href="/liked"
              label="Liked"
              value={liked.length}
              hint={liked.length > 0 ? "Apply when ready →" : "Save roles from feed first"}
            />
            <Tile
              href="/applied"
              label="In flight"
              value={inFlight.length}
              hint={offers.length > 0 ? `${offers.length} offer${offers.length === 1 ? "" : "s"}` : "Awaiting response"}
              tone={offers.length > 0 ? "sage" : undefined}
            />
            <Tile
              href="/skipped"
              label="Reconsider"
              value="·"
              hint="Browse what you passed on →"
              tone="muted"
            />
          </div>

          {stale.length > 0 && (
            <section style={{ marginTop: 36 }}>
              <div className="row between" style={{ marginBottom: 12 }}>
                <h2 className="h2" style={{ fontSize: 20 }}>Needs follow-up</h2>
                <span className="muted" style={{ fontSize: 12 }}>
                  Applied {STALE_THRESHOLD_DAYS}+ days ago with no movement
                </span>
              </div>
              <div className="col gap-2">
                {stale.map((j) => (
                  <FollowupRow key={j.id} job={j} profiles={profiles} />
                ))}
              </div>
            </section>
          )}

          {topNew.length > 0 && (
            <section style={{ marginTop: 36 }}>
              <div className="row between" style={{ marginBottom: 12 }}>
                <h2 className="h2" style={{ fontSize: 20 }}>Top of today&apos;s feed</h2>
                <Link href="/feed" className="mono dim" style={{ fontSize: 12 }}>see all →</Link>
              </div>
              <div className="col gap-2">
                {topNew.map((j) => (
                  <TopRow key={j.id} job={j} profiles={profiles} />
                ))}
              </div>
            </section>
          )}

          {newJobs.length === 0 && stale.length === 0 && inFlight.length === 0 && (
            <section style={{ marginTop: 36 }}>
              <div className="card p-8 center" style={{ flexDirection: "column", textAlign: "center", gap: 14 }}>
                <div className="h2" style={{ fontSize: 24 }}>Nothing to do right now.</div>
                <p className="muted" style={{ maxWidth: 460 }}>
                  Scraper runs every morning at 08:00 UTC. New roles will show up here.
                </p>
              </div>
            </section>
          )}
        </div>
      </div>

      <style>{`
        .dash-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 16px;
        }
        @media (max-width: 840px) {
          .dash-grid { grid-template-columns: repeat(2, 1fr); }
        }
        @media (max-width: 480px) {
          .dash-grid { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  );
}

function Tile({
  href, label, value, hint, tone,
}: {
  href: string; label: string; value: number | string; hint: string;
  tone?: "accent" | "sage" | "muted";
}) {
  const bg = tone === "accent" ? "var(--accent-soft)"
    : tone === "sage" ? "var(--sage-1)"
    : tone === "muted" ? "var(--paper-2)"
    : "var(--card)";
  return (
    <Link href={href} className="card p-5" style={{
      textDecoration: "none", color: "inherit", display: "block", background: bg,
    }}>
      <div className="eyebrow" style={{ marginBottom: 4 }}>{label}</div>
      <div style={{ fontFamily: "var(--f-display)", fontSize: 44, fontWeight: 600, lineHeight: 1, letterSpacing: "-0.02em" }}>
        {value}
      </div>
      <div className="muted" style={{ fontSize: 12, marginTop: 8 }}>{hint}</div>
    </Link>
  );
}

function FollowupRow({ job, profiles }: { job: Job; profiles: any[] }) {
  const days = Math.floor((Date.now() - new Date(job.applied_at!).getTime()) / (24 * 60 * 60 * 1000));
  const veryStale = days >= VERY_STALE_THRESHOLD_DAYS;
  return (
    <Link href={`/job/${job.id}`} className="card p-4" style={{
      display: "block", textDecoration: "none", color: "inherit",
      borderLeft: `3px solid var(${veryStale ? "--rose-2" : "--amber-2"})`,
    }}>
      <div className="row between gap-3">
        <div className="row gap-3 grow" style={{ minWidth: 0 }}>
          <StudioMark company={job.company} size={36} />
          <div style={{ minWidth: 0 }}>
            <div className="row gap-2" style={{ alignItems: "center" }}>
              <span className="eyebrow" style={{ fontSize: 10 }}>{job.company}</span>
              <ProfileBadge profiles={profiles} slug={job.profile_slug} />
            </div>
            <div className="h3" style={{ fontSize: 15, marginTop: 2 }}>{job.title}</div>
          </div>
        </div>
        <div style={{ flex: "0 0 auto", textAlign: "right" }}>
          <div className="mono" style={{ fontSize: 13, color: veryStale ? "var(--rose-2)" : "var(--amber-2)" }}>
            {days}d ago
          </div>
          <div className="muted" style={{ fontSize: 11 }}>applied</div>
        </div>
      </div>
    </Link>
  );
}

function TopRow({ job, profiles }: { job: Job; profiles: any[] }) {
  return (
    <Link href={`/job/${job.id}`} className="card p-4" style={{ display: "block", textDecoration: "none", color: "inherit" }}>
      <div className="row between gap-3">
        <div className="row gap-3 grow" style={{ minWidth: 0 }}>
          <StudioMark company={job.company} size={36} />
          <div style={{ minWidth: 0 }}>
            <div className="row gap-2" style={{ alignItems: "center" }}>
              <span className="eyebrow" style={{ fontSize: 10 }}>{job.company}</span>
              <ProfileBadge profiles={profiles} slug={job.profile_slug} />
            </div>
            <div className="h3" style={{ fontSize: 15, marginTop: 2 }}>{job.title}</div>
          </div>
        </div>
        {job.fit_score != null && (
          <div style={{ flex: "0 0 auto" }}>
            <span className="mono" style={{ fontSize: 14, fontWeight: 600 }}>{job.fit_score}/10</span>
          </div>
        )}
      </div>
    </Link>
  );
}

function todayLabel() {
  return new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
}

function greeting() {
  const h = new Date().getHours();
  if (h < 5) return "Late night";
  if (h < 12) return "Morning";
  if (h < 17) return "Afternoon";
  return "Evening";
}
