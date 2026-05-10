"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ThemeToggle } from "./theme";

export function TopNav() {
  const pathname = usePathname();
  const items = [
    { href: "/feed", label: "Feed" },
    { href: "/applied", label: "Applied" },
  ];
  return (
    <div className="topnav">
      <Link href="/feed" className="logo">
        <span className="logo-mark" />
        <span>questboard</span>
      </Link>
      <div className="nav-links">
        {items.map((it) => {
          const active = pathname === it.href || pathname.startsWith(it.href + "/");
          return (
            <Link key={it.href} href={it.href} className={"nav-link" + (active ? " active" : "")}>
              {it.label}
            </Link>
          );
        })}
      </div>
      <ThemeToggle />
    </div>
  );
}
