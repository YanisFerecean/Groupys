"use client";

import { usePathname, useRouter } from "next/navigation";

const items = [
  { label: "Mutuals",  href: "/match",         icon: "favorite"     },
  { label: "History",  href: "/match/history",  icon: "history"      },
];

export default function MutualsRightSidebar() {
  const pathname = usePathname();
  const router = useRouter();

  if (!pathname?.startsWith("/match")) return null;

  return (
    <aside className="hidden lg:flex flex-col w-52 fixed right-0 top-16 lg:top-20 bottom-0 bg-surface border-l border-surface-container z-30">
      <div className="flex flex-col h-full p-4 pt-6">
        <nav className="flex flex-col gap-1">
          {items.map((item) => {
            const active = item.href === "/match"
              ? pathname === "/match"
              : pathname.startsWith(item.href);
            return (
              <button
                key={item.href}
                onClick={() => router.push(item.href)}
                className={
                  active
                    ? "flex items-center gap-3 px-4 py-3 text-primary font-bold bg-primary/5 rounded-xl"
                    : "flex items-center gap-3 px-4 py-3 text-slate-500 font-medium hover:bg-surface-container rounded-xl transition-colors"
                }
              >
                <span
                  className="material-symbols-outlined"
                  style={active ? { fontVariationSettings: "'FILL' 1" } : undefined}
                >
                  {item.icon}
                </span>
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}
