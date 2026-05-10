"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Job } from "@/lib/supabase";
import { Icon } from "@/components/visual";

type Mode = "actions" | "calibrate" | "draft";

const STATUS_LABELS: Record<Job["status"], string> = {
  new: "New",
  interested: "Interested",
  skip: "Skipped",
  applied: "Applied",
};

export function JobActions({ job }: { job: Job }) {
  const [mode, setMode] = useState<Mode>("actions");
  const [status, setStatus] = useState(job.status);
  const [letter, setLetter] = useState(job.letter_text || "");
  const [variants, setVariants] = useState<string[] | null>(null);
  const [generating, setGenerating] = useState(false);
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  const updateStatus = async (newStatus: Job["status"]) => {
    setBusy(true);
    try {
      const res = await fetch(`/api/jobs/${job.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error(await res.text());
      setStatus(newStatus);
      router.refresh();
    } catch (e: any) {
      alert("Failed: " + e.message);
    } finally {
      setBusy(false);
    }
  };

  const startApply = async () => {
    // If user has no prior calibration sample, generate three voice variants first.
    setMode("calibrate");
    setGenerating(true);
    try {
      const res = await fetch(`/api/draft-letter`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId: job.id, mode: "variants" }),
      });
      if (!res.ok) throw new Error(await res.text());
      const json = await res.json();
      setVariants(json.variants);
    } catch (e: any) {
      alert("Failed: " + e.message);
      setMode("actions");
    } finally {
      setGenerating(false);
    }
  };

  const pickVariant = (text: string) => {
    setLetter(text);
    setMode("draft");
  };

  const saveLetter = async () => {
    setBusy(true);
    try {
      await fetch(`/api/jobs/${job.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ letter_text: letter }),
      });
    } finally {
      setBusy(false);
    }
  };

  const markApplied = async () => {
    setBusy(true);
    try {
      const res = await fetch(`/api/jobs/${job.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "applied",
          letter_text: letter,
          applied_at: new Date().toISOString(),
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      setStatus("applied");
      router.push("/applied");
    } catch (e: any) {
      alert("Failed: " + e.message);
    } finally {
      setBusy(false);
    }
  };

  if (mode === "calibrate") {
    return (
      <div className="card p-5">
        <div className="eyebrow" style={{ marginBottom: 12 }}>Pick the voice</div>
        <p className="body" style={{ fontSize: 13, color: "var(--ink-2)", marginTop: 0 }}>
          Three variants in different tones. Click the one closest to how you'd write — that's the starting draft.
        </p>
        {generating && (
          <div className="col gap-3" style={{ marginTop: 16 }}>
            <div className="skeleton" style={{ height: 80 }} />
            <div className="skeleton" style={{ height: 80 }} />
            <div className="skeleton" style={{ height: 80 }} />
          </div>
        )}
        {!generating && variants && (
          <div className="col gap-3" style={{ marginTop: 16 }}>
            {variants.map((v, i) => (
              <button
                key={i}
                onClick={() => pickVariant(v)}
                className="card p-4"
                style={{
                  textAlign: "left",
                  cursor: "pointer",
                  background: "var(--paper)",
                  border: "1px solid var(--paper-3)",
                  fontSize: 13,
                  lineHeight: 1.5,
                  color: "var(--ink-2)",
                  fontFamily: "var(--f-body)",
                }}
              >
                <div className="mono dim" style={{ fontSize: 10, marginBottom: 6 }}>VARIANT {i + 1}</div>
                {v.slice(0, 280)}{v.length > 280 ? "…" : ""}
              </button>
            ))}
          </div>
        )}
        <button className="btn btn-flat" style={{ marginTop: 16 }} onClick={() => setMode("actions")}>
          Cancel
        </button>
      </div>
    );
  }

  if (mode === "draft") {
    return (
      <div className="card p-5">
        <div className="row between" style={{ marginBottom: 12 }}>
          <div className="eyebrow">Application letter</div>
          <span className="mono dim" style={{ fontSize: 11 }}>{wordCount(letter)} words</span>
        </div>
        <textarea
          value={letter}
          onChange={(e) => setLetter(e.target.value)}
          rows={18}
          style={{ fontFamily: "var(--f-body)", fontSize: 14 }}
        />
        <div className="col gap-2" style={{ marginTop: 14 }}>
          <a
            href={job.url}
            target="_blank"
            rel="noopener noreferrer"
            className="btn"
            style={{ width: "100%", justifyContent: "center" }}
          >
            <Icon.external /> Open application page
          </a>
          <button
            className="btn btn-primary"
            onClick={markApplied}
            disabled={busy}
            style={{ width: "100%", justifyContent: "center" }}
          >
            <Icon.send /> Mark as applied
          </button>
          <button className="btn btn-flat" onClick={saveLetter} disabled={busy} style={{ width: "100%", justifyContent: "center", fontSize: 13 }}>
            Save draft (don't mark applied yet)
          </button>
          <button className="btn btn-ghost" onClick={() => setMode("actions")} style={{ width: "100%", justifyContent: "center", fontSize: 13 }}>
            Back
          </button>
        </div>
      </div>
    );
  }

  // actions mode
  return (
    <>
      <div className="card p-5">
        <div className="eyebrow" style={{ marginBottom: 8 }}>Status</div>
        <div className="row between" style={{ marginBottom: 12 }}>
          <span className="h3" style={{ fontSize: 16 }}>{STATUS_LABELS[status]}</span>
          {status === "applied" && job.applied_at && (
            <span className="mono dim" style={{ fontSize: 11 }}>{new Date(job.applied_at).toLocaleDateString()}</span>
          )}
        </div>
        <div className="col gap-2">
          <a
            href={job.url}
            target="_blank"
            rel="noopener noreferrer"
            className="btn"
            style={{ width: "100%", justifyContent: "center" }}
          >
            <Icon.external /> Open posting
          </a>
          {status !== "applied" && (
            <button
              className="btn btn-primary"
              onClick={startApply}
              disabled={busy}
              style={{ width: "100%", justifyContent: "center" }}
            >
              {job.letter_text ? "Continue draft" : "Draft letter"} <Icon.arrow />
            </button>
          )}
          {job.letter_text && status !== "applied" && (
            <button
              className="btn btn-flat"
              onClick={() => { setLetter(job.letter_text || ""); setMode("draft"); }}
              style={{ width: "100%", justifyContent: "center", fontSize: 13 }}
            >
              Edit saved draft
            </button>
          )}
          <div className="row gap-2" style={{ marginTop: 4 }}>
            <button
              className="btn btn-flat"
              onClick={() => updateStatus(status === "interested" ? "new" : "interested")}
              disabled={busy}
              style={{ flex: 1, justifyContent: "center", fontSize: 13 }}
            >
              {status === "interested" ? "Unmark interested" : "Mark interested"}
            </button>
            <button
              className="btn btn-flat btn-danger"
              onClick={() => updateStatus("skip")}
              disabled={busy || status === "skip"}
              style={{ flex: 1, justifyContent: "center", fontSize: 13 }}
            >
              Skip
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

function wordCount(s: string): number {
  return s.trim().split(/\s+/).filter(Boolean).length;
}
