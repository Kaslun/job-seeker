"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { Job } from "@/lib/supabase";
import { CoverArt, Icon, MatchRing } from "@/components/visual";
import { extractPitch, extractTags, levelFromTitle, relativeTime } from "@/lib/derive";

type FadingMap = Record<string, "left" | "right" | undefined>;

export function FeedClient({ initialJobs }: { initialJobs: Job[] }) {
  const [jobs, setJobs] = useState(initialJobs);
  const [fading, setFading] = useState<FadingMap>({});
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  const decide = async (job: Job, decision: "skip" | "interested") => {
    if (busy || fading[job.id]) return;
    setBusy(true);
    setFading((f) => ({ ...f, [job.id]: decision === "skip" ? "left" : "right" }));

    try {
      const res = await fetch(`/api/jobs/${job.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: decision }),
      });
      if (!res.ok) throw new Error(await res.text());

      // Wait for animation to finish, then drop from list.
      await new Promise((r) => setTimeout(r, 350));
      setJobs((js) => js.filter((j) => j.id !== job.id));
      router.refresh();
    } catch (e: any) {
      // Roll back
      setFading((f) => ({ ...f, [job.id]: undefined }));
      alert("Failed: " + e.message);
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLElement && (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA")) return;
      const top = jobs.find((j) => !fading[j.id]);
      if (!top) return;
      if (e.key === "ArrowRight") decide(top, "interested");
      if (e.key === "ArrowLeft") decide(top, "skip");
      if (e.key === "Enter") router.push(`/job/${top.id}`);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  if (jobs.length === 0) {
    return (
      <div className="card p-8 center" style={{ flexDirection: "column", textAlign: "center", gap: 12 }}>
        <div className="h1" style={{ fontSize: 36 }}>Inbox zero.</div>
        <p className="muted" style={{ maxWidth: 400 }}>
          No new jobs to review. The scraper runs daily at 09:00 Oslo — come back tomorrow, or check the Applied tab.
        </p>
      </div>
    );
  }

  return (
    <div className="col gap-3">
      {jobs.map((j, idx) => {
        const ex = fading[j.id];
        const pitch = extractPitch(j.jd_text);
        const tags = extractTags(j.jd_text, j.location, j.remote_type);
        const level = levelFromTitle(j.title);
        const isTop = idx === 0;
        const exitVars = ex
          ? ({
              "--exit-x": ex === "right" ? "900px" : "-900px",
              "--exit-r": ex === "right" ? "8deg" : "-8deg",
            } as React.CSSProperties)
          : {};
        return (
          <div
            key={j.id}
            className={"card feed-card p-5" + (ex ? " fading" : "")}
            style={exitVars}
            onClick={(e) => {
              const tag = (e.target as HTMLElement).closest("button");
              if (!tag) router.push(`/job/${j.id}`);
            }}
          >
            <div className="row gap-4 start">
              <CoverArt
                company={j.company}
                title={j.title}
                style={{ width: 200, flex: "0 0 200px", fontSize: 22 }}
              />
              <div className="grow">
                <div className="row between start" style={{ marginBottom: 8 }}>
                  <div>
                    <div className="row gap-2" style={{ marginBottom: 4 }}>
                      <span className="eyebrow">{j.company}</span>
                      {isTop && (
                        <span
                          className="mono"
                          style={{
                            fontSize: 10,
                            padding: "1px 6px",
                            background: "var(--ink)",
                            color: "var(--paper)",
                            borderRadius: 999,
                          }}
                        >
                          UP NEXT
                        </span>
                      )}
                      <span className="chip chip-outline" style={{ fontSize: 11 }}>
                        {level}
                      </span>
                    </div>
                    <h2 className="h2" style={{ fontSize: 24 }}>{j.title}</h2>
                  </div>
                  {j.fit_score != null && <MatchRing score={j.fit_score} />}
                </div>
                <div className="row wrap gap-3" style={{ fontSize: 13, color: "var(--ink-2)", marginBottom: 10 }}>
                  {j.location && (
                    <span className="row gap-2"><Icon.pin /> {j.location}</span>
                  )}
                  {j.salary_text && (
                    <span className="row gap-2"><Icon.cash /> {j.salary_text}</span>
                  )}
                  <span className="row gap-2"><Icon.cal /> {relativeTime(j.discovered_at)}</span>
                </div>
                {pitch && (
                  <p className="body" style={{ margin: "0 0 12px", color: "var(--ink-2)", fontSize: 14 }}>
                    {pitch}
                  </p>
                )}
                <div className="row between">
                  <div className="row wrap gap-2">
                    {tags.map((t, i) => (
                      <span key={i} className={"chip" + (i === 0 ? " chip-accent" : "")}>
                        {t}
                      </span>
                    ))}
                  </div>
                  <div className="row gap-2">
                    <button
                      className="btn btn-icon"
                      title="Skip (←)"
                      disabled={!!ex || busy}
                      onClick={(e) => {
                        e.stopPropagation();
                        decide(j, "skip");
                      }}
                    >
                      <Icon.x />
                    </button>
                    <button
                      className="btn btn-icon btn-primary"
                      title="Interested (→)"
                      disabled={!!ex || busy}
                      onClick={(e) => {
                        e.stopPropagation();
                        decide(j, "interested");
                      }}
                    >
                      <Icon.heart />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
