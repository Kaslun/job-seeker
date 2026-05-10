"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Job } from "@/lib/supabase";
import { Icon } from "@/components/visual";

type Mode = "actions" | "drafting" | "draft";

const STATUS_LABELS: Record<Job["status"], string> = {
  new: "New",
  interested: "Interested",
  skip: "Skipped",
  applied: "Applied",
  screen: "In screen",
  rejected: "Rejected",
  withdrawn: "Withdrew",
  offer: "Offer",
  ghosted: "Ghosted",
};

// Transitions that show as buttons. Terminal states get no buttons.
const TRANSITIONS: Partial<Record<Job["status"], { to: Job["status"]; label: string; tone?: "primary" | "danger" | "flat" }[]>> = {
  applied: [
    { to: "screen", label: "Heard back", tone: "primary" },
    { to: "rejected", label: "Rejected", tone: "danger" },
    { to: "ghosted", label: "Ghosted", tone: "flat" },
    { to: "withdrawn", label: "Withdrew", tone: "flat" },
  ],
  screen: [
    { to: "offer", label: "Got offer", tone: "primary" },
    { to: "rejected", label: "Rejected", tone: "danger" },
    { to: "withdrawn", label: "Withdrew", tone: "flat" },
  ],
  offer: [
    { to: "withdrawn", label: "Withdrew", tone: "flat" },
  ],
};

const TERMINAL: Job["status"][] = ["rejected", "withdrawn", "ghosted"];

export function JobActions({ job }: { job: Job }) {
  const [mode, setMode] = useState<Mode>("actions");
  const [status, setStatus] = useState(job.status);
  const [letter, setLetter] = useState(job.letter_text || "");
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

  const generateDraft = async () => {
    setMode("drafting");
    try {
      const res = await fetch(`/api/draft-letter`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId: job.id, mode: "single" }),
      });
      if (!res.ok) throw new Error(await res.text());
      const json = await res.json();
      setLetter(json.letter || "");
      setMode("draft");
    } catch (e: any) {
      alert("Failed: " + e.message);
      setMode("actions");
    }
  };

  const openSavedDraft = () => {
    setLetter(job.letter_text || "");
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

  const regenerate = async () => {
    if (letter && !confirm("Replace your current draft with a fresh one?")) return;
    await generateDraft();
  };

  if (mode === "drafting") {
    return (
      <div className="card p-5">
        <div className="eyebrow" style={{ marginBottom: 12 }}>Drafting letter</div>
        <p className="muted" style={{ fontSize: 13, marginTop: 0 }}>
          Writing in your voice. Takes about 10 seconds.
        </p>
        <div className="col gap-2" style={{ marginTop: 16 }}>
          <div className="skeleton" style={{ height: 12 }} />
          <div className="skeleton" style={{ height: 12, width: "92%" }} />
          <div className="skeleton" style={{ height: 12, width: "88%" }} />
          <div className="skeleton" style={{ height: 12, width: "70%" }} />
          <div className="skeleton" style={{ height: 12, marginTop: 12 }} />
          <div className="skeleton" style={{ height: 12, width: "94%" }} />
          <div className="skeleton" style={{ height: 12, width: "60%" }} />
        </div>
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
          <button
            className="btn btn-flat"
            onClick={saveLetter}
            disabled={busy}
            style={{ width: "100%", justifyContent: "center", fontSize: 13 }}
          >
            Save draft (don&apos;t mark applied yet)
          </button>
          <button
            className="btn btn-flat"
            onClick={regenerate}
            disabled={busy}
            style={{ width: "100%", justifyContent: "center", fontSize: 13 }}
          >
            Regenerate from scratch
          </button>
          <button
            className="btn btn-ghost"
            onClick={() => setMode("actions")}
            style={{ width: "100%", justifyContent: "center", fontSize: 13 }}
          >
            Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="card p-5">
      <div className="eyebrow" style={{ marginBottom: 8 }}>Status</div>
      <div className="row between" style={{ marginBottom: 12 }}>
        <span className="h3" style={{ fontSize: 16 }}>{STATUS_LABELS[status]}</span>
        {status === "applied" && job.applied_at && (
          <span className="mono dim" style={{ fontSize: 11 }}>
            {new Date(job.applied_at).toLocaleDateString()}
          </span>
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
          <>
            {job.letter_text ? (
              <button
                className="btn btn-primary"
                onClick={openSavedDraft}
                disabled={busy}
                style={{ width: "100%", justifyContent: "center" }}
              >
                Edit saved draft <Icon.arrow />
              </button>
            ) : (
              <button
                className="btn btn-primary"
                onClick={generateDraft}
                disabled={busy}
                style={{ width: "100%", justifyContent: "center" }}
              >
                Draft letter <Icon.arrow />
              </button>
            )}
            <div className="row gap-2" style={{ marginTop: 4 }}>
              <button
                className="btn btn-flat"
                onClick={() => updateStatus(status === "interested" ? "new" : "interested")}
                disabled={busy}
                style={{ flex: 1, justifyContent: "center", fontSize: 13 }}
              >
                {status === "interested" ? "Unmark" : "Interested"}
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
          </>
        )}
        {status === "applied" && job.letter_text && (
          <button
            className="btn btn-flat"
            onClick={openSavedDraft}
            style={{ width: "100%", justifyContent: "center", fontSize: 13 }}
          >
            View letter sent
          </button>
        )}
        {TRANSITIONS[status] && (
          <>
            <div className="eyebrow" style={{ marginTop: 12, marginBottom: 4, fontSize: 10 }}>Update status</div>
            <div className="col gap-2">
              {TRANSITIONS[status]!.map((t) => (
                <button
                  key={t.to}
                  className={
                    "btn " +
                    (t.tone === "primary" ? "btn-primary" : t.tone === "danger" ? "btn-flat btn-danger" : "btn-flat")
                  }
                  onClick={() => updateStatus(t.to)}
                  disabled={busy}
                  style={{ width: "100%", justifyContent: "center", fontSize: 13 }}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </>
        )}
        {TERMINAL.includes(status) && (
          <div className="muted" style={{ fontSize: 12, marginTop: 8, textAlign: "center" }}>
            {status === "rejected" && "They passed."}
            {status === "withdrawn" && "You pulled this one."}
            {status === "ghosted" && "Heard nothing back."}
          </div>
        )}
      </div>
    </div>
  );
}

function wordCount(s: string): number {
  return s.trim().split(/\s+/).filter(Boolean).length;
}
