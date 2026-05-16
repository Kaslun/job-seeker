"use client";

import { useEffect, useState } from "react";
import type { Profile } from "@/lib/supabase";

const STORAGE_KEY = "profile_filter_v1";

/**
 * Reads the persisted filter from localStorage. Returns null until hydrated.
 * Default behavior when no filter is stored: all profiles selected.
 */
export function useProfileFilter(profiles: Profile[]): {
  selected: Set<string> | null;
  toggle: (slug: string) => void;
  setAll: () => void;
  setOnly: (slug: string) => void;
} {
  const [selected, setSelected] = useState<Set<string> | null>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const slugs: string[] = JSON.parse(stored);
        // Drop any slug that no longer exists as a profile.
        const valid = slugs.filter((s) => profiles.some((p) => p.slug === s));
        if (valid.length > 0) {
          setSelected(new Set(valid));
          return;
        }
      }
    } catch {
      // fall through
    }
    setSelected(new Set(profiles.map((p) => p.slug)));
  }, [profiles]);

  const persist = (s: Set<string>) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(s)));
    } catch {}
  };

  const toggle = (slug: string) => {
    setSelected((prev) => {
      if (!prev) return prev;
      const next = new Set(prev);
      if (next.has(slug)) {
        // Don't allow zero selected — that's an empty feed with no signal.
        if (next.size === 1) return prev;
        next.delete(slug);
      } else {
        next.add(slug);
      }
      persist(next);
      return next;
    });
  };

  const setAll = () => {
    const next = new Set(profiles.map((p) => p.slug));
    persist(next);
    setSelected(next);
  };

  const setOnly = (slug: string) => {
    const next = new Set([slug]);
    persist(next);
    setSelected(next);
  };

  return { selected, toggle, setAll, setOnly };
}

export function ProfileFilterChips({
  profiles,
  selected,
  onToggle,
  onSetAll,
}: {
  profiles: Profile[];
  selected: Set<string> | null;
  onToggle: (slug: string) => void;
  onSetAll: () => void;
}) {
  if (!selected) {
    // Hydrating — render a placeholder so layout doesn't jump.
    return <div style={{ height: 32, marginBottom: 18 }} />;
  }

  const allOn = profiles.every((p) => selected.has(p.slug));

  return (
    <div className="row gap-2 wrap" style={{ marginBottom: 18, alignItems: "center" }}>
      <span className="eyebrow" style={{ fontSize: 10, marginRight: 4 }}>Filter</span>
      <button
        className="filter-chip"
        data-active={allOn}
        onClick={onSetAll}
        disabled={allOn}
      >
        All
      </button>
      {profiles.map((p) => (
        <button
          key={p.slug}
          className="filter-chip"
          data-active={selected.has(p.slug)}
          onClick={() => onToggle(p.slug)}
        >
          {p.name}
        </button>
      ))}
      <style jsx>{`
        .filter-chip {
          padding: 5px 13px;
          border-radius: 999px;
          border: 1px solid var(--paper-3);
          background: transparent;
          color: var(--ink-2);
          font-family: var(--f-body);
          font-size: 12px;
          font-weight: 500;
          cursor: pointer;
          transition: background .12s, color .12s, border-color .12s;
        }
        .filter-chip:hover:not(:disabled) {
          background: var(--card);
          color: var(--ink);
        }
        .filter-chip[data-active="true"] {
          background: var(--ink);
          color: var(--paper);
          border-color: var(--ink);
        }
        .filter-chip:disabled { cursor: default; }
      `}</style>
    </div>
  );
}

/**
 * Returns a small badge labeling which profile a job belongs to.
 * Returns null if there's only one profile or if the slug is unknown.
 */
export function ProfileBadge({
  profiles,
  slug,
}: {
  profiles: Profile[];
  slug: string | null | undefined;
}) {
  if (!slug || profiles.length <= 1) return null;
  const p = profiles.find((x) => x.slug === slug);
  if (!p) return null;
  return (
    <span
      className="chip chip-outline"
      style={{ fontSize: 10, padding: "2px 8px", textTransform: "uppercase", letterSpacing: "0.04em" }}
      title={p.name}
    >
      {p.name}
    </span>
  );
}
