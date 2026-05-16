"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { ThemeToggle } from "./theme";

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

export function Sidebar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const groups = NAV_ITEMS.reduce<Record<string, NavItem[]>>((acc, item) => {
    (acc[item.group] = acc[item.group] || []).push(item);
    return acc;
  }, {});

  return (
    <>
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
        .sidebar-nav { flex: 1; display: flex; flex-direction: column; gap: 20px; padding: 0 6px; }
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
