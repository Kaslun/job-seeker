"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { Job } from "@/lib/supabase";
import { Icon } from "@/components/visual";

type Mode = "viewing" | "generating" | "revising";

export function LetterClient({ job }: { job: Job }) {
  const [letter, setLetter] = useState(job.letter_text || "");
  const [notes, setNotes] = useState("");
  const [mode, setMode] = useState<Mode>("viewing");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [revisionCount, setRevisionCount] = useState(0);
  const router = useRouter();

  useEffect(() => {
    if (!job.letter_text) {
      generateFresh();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function generateFresh() {
    setMode("generating");
    setError(null);
    try {
      const res = await fetch(`/api/draft-letter`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId: job.id, mode: "single" }),
      });
      if (!res.ok) throw new Error(await res.text());
      const json = await res.json();
      setLetter(json.letter);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setMode("viewing");
    }
  }

  async function reviseWithNotes() {
    if (!notes.trim()) return;
    setMode("revising");
    setError(null);
    try {
      const res = await fetch(`/api/draft-letter`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobId: job.id,
          mode: "revise",
          previousDraft: letter,
          revisionNotes: notes,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      const json = await res.json();
      setLetter(json.letter);
      setNotes("");
      setRevisionCount((c) => c + 1);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setMode("viewing");
    }
  }

  async function save() {
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
  }

  async function markApplied() {
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
      router.refresh();
      router.push("/applied");
    } catch (e: any) {
      setError(e.message);
      setBusy(false);
    }
  }

  function printLetter() {
    window.print();
  }

  const isGen = mode === "generating" || mode === "revising";

  return (
    <>
      <style jsx global>{`
        /* The print-only div carries the full letter for printing. */
        .letter-print-only {
          display: none;
        }
        @media print {
          /* Hide everything by default */
          body * { visibility: hidden; }
          /* Show only the print-only block */
          .letter-print-only, .letter-print-only * { visibility: visible; }
          .letter-print-only {
            display: block !important;
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            padding: 20mm;
            font-family: 'EB Garamond', 'Georgia', 'Times New Roman', serif;
            font-size: 11.5pt;
            line-height: 1.6;
            color: #15130f;
            background: white;
            white-space: pre-wrap;
            word-wrap: break-word;
          }
          @page { size: A4; margin: 0; }
        }

        /* Screen styling: paper-look A4 preview */
        .letter-page {
          background: #faf8f1;
          color: #15130f;
          width: 210mm;
          min-height: 297mm;
          padding: 28mm 24mm;
          box-shadow: 0 4px 24px rgba(21,19,15,0.12), 0 1px 0 rgba(21,19,15,0.04);
          border-radius: 4px;
          font-family: 'EB Garamond', 'Georgia', 'Times New Roman', serif;
          font-size: 11.5pt;
          line-height: 1.55;
        }
        [data-theme="dark"] .letter-page {
          background: #faf8f1;
          color: #15130f;
        }
        .letter-page .letter-textarea {
          width: 100%;
          background: transparent;
          color: inherit;
          font-family: inherit;
          font-size: inherit;
          line-height: inherit;
          border: none;
          outline: none;
          resize: none;
          min-height: 220mm;
          padding: 0;
          white-space: pre-wrap;
          word-wrap: break-word;
        }
      `}</style>

      {/* Hidden print-only block. Contains the full letter text in print-safe markup
          (not a textarea, which doesn't reliably print). */}
      <div className="letter-print-only">{letter}</div>

      <div style={{ display: "grid", gridTemplateColumns: "210mm 1fr", gap: 28, alignItems: "flex-start" }}>
        <div className="letter-page">
          {isGen ? (
            <div className="col gap-3">
              <div className="skeleton" style={{ height: 16, width: "70%" }} />
              <div className="skeleton" style={{ height: 12, width: "100%" }} />
              <div className="skeleton" style={{ height: 12, width: "95%" }} />
              <div className="skeleton" style={{ height: 12, width: "98%" }} />
              <div className="skeleton" style={{ height: 12, width: "60%" }} />
              <div style={{ height: 18 }} />
              <div className="skeleton" style={{ height: 12, width: "100%" }} />
              <div className="skeleton" style={{ height: 12, width: "94%" }} />
              <div className="skeleton" style={{ height: 12, width: "100%" }} />
              <div className="skeleton" style={{ height: 12, width: "55%" }} />
              <div style={{ marginTop: 24, fontFamily: "var(--f-mono)", fontSize: 10, color: "#8a8478" }}>
                {mode === "revising" ? "Revising with notes..." : "Drafting..."}
              </div>
            </div>
          ) : (
            <textarea
              className="letter-textarea"
              value={letter}
              onChange={(e) => setLetter(e.target.value)}
              spellCheck
              placeholder="Letter will appear here..."
            />
          )}
        </div>

        <aside className="col gap-4" style={{ position: "sticky", top: 24 }}>
          <div className="card p-4">
            <div className="eyebrow" style={{ marginBottom: 10 }}>Letter</div>
            <div className="row between" style={{ marginBottom: 4, fontSize: 12 }}>
              <span className="muted">Words</span>
              <span className="mono">{wordCount(letter)}</span>
            </div>
            <div className="row between" style={{ marginBottom: 4, fontSize: 12 }}>
              <span className="muted">Revisions</span>
              <span className="mono">{revisionCount}</span>
            </div>
            {job.lang && (
              <div className="row between" style={{ fontSize: 12 }}>
                <span className="muted">Language</span>
                <span className="mono">{job.lang.toUpperCase()}</span>
              </div>
            )}
          </div>

          {error && (
            <div className="card p-4" style={{ borderColor: "var(--rose-2)", color: "var(--rose-2)", fontSize: 13 }}>
              {error}
            </div>
          )}

          <div className="card p-4">
            <div className="eyebrow" style={{ marginBottom: 8 }}>Notes for revision</div>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={5}
              placeholder="e.g. cut the second paragraph, less formal, lead with Mørkredd instead"
              style={{ fontSize: 13 }}
              disabled={isGen}
            />
            <button
              className="btn btn-primary"
              onClick={reviseWithNotes}
              disabled={isGen || !notes.trim()}
              style={{ width: "100%", justifyContent: "center", marginTop: 10 }}
            >
              {mode === "revising" ? "Revising..." : "Revise with notes"}
            </button>
            <button
              className="btn btn-flat"
              onClick={generateFresh}
              disabled={isGen}
              style={{ width: "100%", justifyContent: "center", marginTop: 8, fontSize: 13 }}
            >
              {mode === "generating" ? "Generating..." : "Regenerate from scratch"}
            </button>
          </div>

          <div className="card p-4">
            <div className="eyebrow" style={{ marginBottom: 8 }}>When ready</div>
            <a href={job.url} target="_blank" rel="noopener noreferrer" className="btn" style={{ width: "100%", justifyContent: "center" }}>
              <Icon.external /> Open application page
            </a>
            <button className="btn btn-flat" onClick={save} disabled={busy || isGen} style={{ width: "100%", justifyContent: "center", marginTop: 8, fontSize: 13 }}>
              Save draft
            </button>
            <button className="btn btn-flat" onClick={printLetter} disabled={busy || isGen || !letter.trim()} style={{ width: "100%", justifyContent: "center", marginTop: 8, fontSize: 13 }}>
              Print / Save as PDF
            </button>
            <button className="btn btn-primary" onClick={markApplied} disabled={busy || isGen || !letter.trim()} style={{ width: "100%", justifyContent: "center", marginTop: 8 }}>
              <Icon.send /> Mark as applied
            </button>
          </div>
        </aside>
      </div>
    </>
  );
}

function wordCount(s: string): number {
  return s.trim().split(/\s+/).filter(Boolean).length;
}
