"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { Job, Profile } from "@/lib/supabase";
import { CoverArt, Icon, MatchRing, StudioMark } from "@/components/visual";
import { ProfileBadge, ProfileFilterChips, useProfileFilter } from "@/components/profile-filter";

type Decision = "interested" | "skip";

export function FeedClient({ initialJobs, profiles }: { initialJobs: Job[]; profiles: Profile[] }) {
  const [jobs, setJobs] = useState(initialJobs);
  const [busy, setBusy] = useState(false);
  const [exiting, setExiting] = useState<string | null>(null);
  const router = useRouter();

  const { selected, toggle, setAll } = useProfileFilter(profiles);

  const visibleJobs = useMemo(() => {
    if (!selected) return jobs;
    return jobs.filter((j) => j.profile_slug && selected.has(j.profile_slug));
  }, [jobs, selected]);

  const current = visibleJobs[0];

  async function decide(d: Decision) {
    if (!current || busy) return;
    setBusy(true);
    setExiting(current.id);
    try {
      await fetch(`/api/jobs/${current.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: d }),
      });
      await new Promise((r) => setTimeout(r, 280));
      setJobs((js) => js.filter((j) => j.id !== current.id));
      router.refresh();
    } catch (e) {
      console.error(e);
    } finally {
      setExiting(null);
      setBusy(false);
    }
  }

  function openJob() {
    if (!current) return;
    router.push(`/job/${current.id}`);
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.target instanceof HTMLElement && ["INPUT", "TEXTAREA"].includes(e.target.tagName)) return;
      if (e.key === "ArrowLeft") { e.preventDefault(); decide("skip"); }
      else if (e.key === "ArrowRight") { e.preventDefault(); decide("interested"); }
      else if (e.key === "Enter") { e.preventDefault(); openJob(); }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current, busy]);

  return (
    <>
      <ProfileFilterChips
        profiles={profiles}
        selected={selected}
        onToggle={toggle}
        onSetAll={setAll}
      />

      {visibleJobs.length === 0 ? (
        <EmptyState totalFetched={jobs.length} />
      ) : (
        <article
          className="card p-0"
          style={{
            overflow: "hidden",
            transition: "transform .28s ease, opacity .28s ease",
            transform: exiting === current.id ? "translateX(-40px)" : "translateX(0)",
            opacity: exiting === current.id ? 0 : 1,
          }}
        >
          <CoverArt company={current.company} title={current.title} style={{ aspectRatio: "21/9", fontSize: 64 }} />
          <div style={{ padding: 28 }}>
            <div className="row between start" style={{ gap: 16, marginBottom: 14 }}>
              <div className="grow">
                <div className="row gap-3" style={{ marginBottom: 6, alignItems: "center" }}>
                  <StudioMark company={current.company} size={28} />
                  <span className="eyebrow">{current.company}</span>
                  <ProfileBadge profiles={profiles} slug={current.profile_slug} />
                </div>
                <h2 className="h2" style={{ fontSize: 30 }}>{current.title}</h2>
                <div className="row wrap gap-4" style={{ marginTop: 10, fontSize: 13, color: "var(--ink-2)" }}>
                  {current.location && <span className="row gap-2"><Icon.pin /> {current.location}</span>}
                  {current.remote_type && <span className="row gap-2">{current.remote_type}</span>}
                  {current.lang === "no" && <span className="row gap-2">Norsk JD</span>}
                </div>
              </div>
              {current.fit_score != null && <MatchRing score={current.fit_score} size={56} />}
            </div>

            {current.fit_rationale && (
              <p className="body" style={{ fontSize: 14, color: "var(--ink-2)", margin: "8px 0 18px" }}>
                {current.fit_rationale}
              </p>
            )}

            <div className="row gap-2 wrap">
              <button className="btn btn-flat btn-danger" onClick={() => decide("skip")} disabled={busy}>
                <Icon.x /> Pass
              </button>
              <button className="btn btn-flat" onClick={openJob} disabled={busy}>
                Open <Icon.arrow />
              </button>
              <button className="btn btn-primary" onClick={() => decide("interested")} disabled={busy}>
                <Icon.heart /> Save
              </button>
              <span className="muted" style={{ marginLeft: "auto", alignSelf: "center", fontSize: 12 }}>
                {visibleJobs.length - 1} more queued
              </span>
            </div>
          </div>
        </article>
      )}
    </>
  );
}

function EmptyState({ totalFetched }: { totalFetched: number }) {
  return (
    <div className="card p-8 center" style={{ flexDirection: "column", textAlign: "center", gap: 14 }}>
      <div className="h2" style={{ fontSize: 26 }}>
        {totalFetched === 0 ? "No new roles to triage." : "Nothing matching this filter."}
      </div>
      <p className="muted" style={{ maxWidth: 440 }}>
        {totalFetched === 0
          ? "The scraper runs daily. Come back tomorrow, or trigger a manual run from GitHub Actions."
          : "Try toggling another profile chip, or hit All."}
      </p>
    </div>
  );
}
