import Link from "next/link";
import type { Job, Profile } from "@/lib/supabase";
import { StudioMark } from "./visual";
import { ProfileBadge } from "./profile-filter";

const STATUS_LABELS: Record<string, string> = {
  new: "New",
  interested: "Liked",
  applied: "Applied",
  screen: "In screen",
  offer: "Offer",
  rejected: "Rejected",
  withdrawn: "Withdrew",
  ghosted: "Ghosted",
  skip: "Skipped",
};

type Mode = "liked" | "applied" | "closed";

export function JobList({ jobs, mode, profiles = [] }: { jobs: Job[]; mode: Mode; profiles?: Profile[] }) {
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
                <div className="row gap-2" style={{ marginBottom: 2 }}>
                  <span className="eyebrow" style={{ fontSize: 10 }}>{j.company}</span>
                  <ProfileBadge profiles={profiles} slug={j.profile_slug} />
                </div>
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
