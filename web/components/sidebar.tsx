"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { ThemeToggle } from "./theme";
import type { Profile } from "@/lib/supabase";

type NavItem = { href: string; label: string; group: string };

const NAV_ITEMS: NavItem[] = [
  { href: "/feed", label: "Feed", group: "discover" },
  { href: "/liked", label: "Liked", group: "discover" },
  { href: "/applied", label: "Applied", group: "track" },
  { href: "/profiles", label: "Profiles", group: "setup" },
];

const GROUP_LABELS: Record<string, string> = {
  discover: "Discover",
  track: "Track",
  setup: "Setup",
};

export function Sidebar({
  profiles,
  activeProfileSlug,
}: {
  profiles: Profile[];
  activeProfileSlug: string | null;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [switching, setSwitching] = useState(false);

  const setActiveProfile = async (slug: string) => {
    if (slug === activeProfileSlug) return;
    setSwitching(true);
    try {
      await fetch("/api/profile/active", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug }),
      });
      router.refresh();
    } finally {
      setSwitching(false);
    }
  };

  const groups = NAV_ITEMS.reduce<Record<string, NavItem[]>>((acc, item) => {
    (acc[item.group] = acc[item.group] || []).push(item);
    return acc;
  }, {});

  return (
    <>
      {/* Mobile toggle */}
      <button
        className="sidebar-mobile-toggle"
        onClick={() => setMobileOpen(!mobileOpen)}
        aria-label="Toggle menu"
      >
        ☰
      </button>
      {mobileOpen && (
        <div className="sidebar-backdrop" onClick={() => setMobileOpen(false)} />
      )}

      <aside className={"sidebar" + (mobileOpen ? " open" : "")}>
        <div className="sidebar-inner">
          <Link href="/feed" className="logo" onClick={() => setMobileOpen(false)}>
            <span className="logo-mark" />
            <span>questboard</span>
          </Link>

          {profiles.length > 0 && (
            <div className="profile-switcher">
              <div className="eyebrow" style={{ fontSize: 10, marginBottom: 6 }}>Active profile</div>
              <div className="col gap-1">
                {profiles.map((p) => {
                  const active = p.slug === activeProfileSlug;
                  return (
                    <button
                      key={p.slug}
                      className={"profile-pill" + (active ? " active" : "")}
                      onClick={() => setActiveProfile(p.slug)}
                      disabled={switching}
                    >
                      <span style={{ flex: 1, textAlign: "left" }}>{p.name}</span>
                      {active && <span className="profile-pill-dot" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <nav className="sidebar-nav">
            {Object.entries(groups).map(([group, items]) => (
              <div key={group} className="sidebar-group">
                <div className="eyebrow" style={{ fontSize: 10, marginBottom: 6 }}>{GROUP_LABELS[group]}</div>
                <div className="col gap-1">
                  {items.map((it) => {
                    const active = pathname === it.href || pathname.startsWith(it.href + "/");
                    return (
                      <Link
                        key={it.href}
                        href={it.href}
                        onClick={() => setMobileOpen(false)}
                        className={"sidebar-link" + (active ? " active" : "")}
                      >
                        {it.label}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>

          <div className="sidebar-footer">
            <ThemeToggle />
          </div>
        </div>
      </aside>

      <style jsx global>{`
        .sidebar-mobile-toggle {
          display: none;
          position: fixed; top: 12px; left: 12px; z-index: 50;
          width: 40px; height: 40px;
          border-radius: 999px;
          border: 1.5px solid var(--paper-3);
          background: var(--card); color: var(--ink);
          font-size: 18px; cursor: pointer;
          box-shadow: var(--shadow-card);
        }
        .sidebar-backdrop {
          display: none;
          position: fixed; inset: 0;
          background: rgba(0,0,0,0.4); z-index: 40;
        }
        .sidebar {
          position: fixed; top: 0; left: 0; bottom: 0;
          width: 240px;
          background: var(--paper-2);
          border-right: 1px solid var(--paper-3);
          z-index: 45;
          overflow-y: auto;
        }
        .sidebar-inner {
          padding: 24px 18px;
          display: flex; flex-direction: column;
          gap: 24px; height: 100%;
        }
        .sidebar .logo { padding: 0 6px; }
        .profile-switcher { padding: 0 6px; }
        .profile-pill {
          display: flex; align-items: center;
          width: 100%;
          padding: 8px 12px;
          border-radius: 999px;
          font-family: var(--f-body);
          font-size: 13px; font-weight: 500;
          background: transparent;
          border: 1px solid var(--paper-3);
          color: var(--ink-2);
          cursor: pointer;
          transition: background .12s, border-color .12s, color .12s;
          text-align: left;
        }
        .profile-pill:hover:not(:disabled) {
          background: var(--card);
          color: var(--ink);
        }
        .profile-pill.active {
          background: var(--ink);
          color: var(--paper);
          border-color: var(--ink);
        }
        .profile-pill-dot {
          width: 6px; height: 6px; border-radius: 50%;
          background: var(--accent);
        }
        .profile-pill:disabled { opacity: 0.6; cursor: not-allowed; }
        .sidebar-nav { flex: 1; display: flex; flex-direction: column; gap: 20px; padding: 0 6px; }
        .sidebar-group {}
        .sidebar-link {
          display: block;
          padding: 7px 12px;
          border-radius: 8px;
          font-size: 14px; font-weight: 500;
          color: var(--ink-2);
          text-decoration: none;
          transition: background .12s, color .12s;
        }
        .sidebar-link:hover { background: var(--card); color: var(--ink); }
        .sidebar-link.active {
          background: var(--ink);
          color: var(--paper);
        }
        .sidebar-footer {
          padding: 0 6px;
          margin-top: auto;
        }
        .main-shifted { padding-left: 240px; }
        @media (max-width: 840px) {
          .sidebar-mobile-toggle { display: flex; align-items: center; justify-content: center; }
          .sidebar { transform: translateX(-100%); transition: transform .25s ease; }
          .sidebar.open { transform: translateX(0); }
          .sidebar-backdrop { display: block; }
          .main-shifted { padding-left: 0; padding-top: 60px; }
        }
      `}</style>
    </>
  );
}
