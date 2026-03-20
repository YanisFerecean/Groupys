"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";

const navItems = [
  { label: "Feed", icon: "rss_feed", href: "/feed" },
  { label: "Discover", icon: "explore", href: "/discover" },
  { label: "Match", icon: "favorite", href: "/match" },
  { label: "Profile", icon: "person_outline", href: "/profile" },
];

export default function SideNav() {
  const pathname = usePathname();

  return (
    <aside className="h-screen w-64 fixed left-0 top-0 bg-surface border-r border-surface-container z-50 flex flex-col">
      <div className="flex flex-col h-full p-6">
        <Link
          href="/"
          className="text-3xl font-extrabold tracking-tighter text-primary mb-8 block"
        >
          Groupys
        </Link>

        <nav className="flex flex-col gap-1">
          {navItems.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                className={
                  active
                    ? "flex items-center gap-3 px-6 py-3 text-primary font-bold bg-primary/5 rounded-xl"
                    : "flex items-center gap-3 px-6 py-3 text-slate-500 font-medium hover:bg-surface-container rounded-xl transition-colors"
                }
              >
                <span className="material-symbols-outlined">{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto pt-8">
          <div className="bg-surface-container h-px mb-6" />
          <p className="px-6 text-[0.6875rem] font-semibold uppercase tracking-widest text-on-surface-variant opacity-40">
            High-Fidelity
          </p>
        </div>
      </div>
    </aside>
  );
}
