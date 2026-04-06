"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { useHotTakeStore } from "@/store/hotTakeStore";

const navItems = [
  { label: "Feed", icon: "rss_feed", href: "/feed" },
  { label: "Discover", icon: "explore", href: "/discover" },
  { label: "Mutuals", icon: "favorite", href: "/match" },
  { label: "Profile", icon: "person_outline", href: "/profile" },
];

interface SideNavProps {
  open?: boolean;
  onClose?: () => void;
}

export default function SideNav({ open, onClose }: SideNavProps) {
  const pathname = usePathname();
  const hasUnansweredHotTake = useHotTakeStore((s) => s.hasUnanswered);

  return (
    <>
      {/* Backdrop for mobile */}
      {open && (
        <div
          className="fixed inset-0 z-50 bg-black/40 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={cn(
          "h-screen w-64 fixed left-0 top-0 bg-surface border-r border-surface-container z-50 flex flex-col transition-transform duration-300",
          "max-lg:-translate-x-full max-lg:data-[open=true]:translate-x-0",
          "lg:translate-x-0",
        )}
        data-open={open}
      >
        <div className="flex flex-col h-full p-6">
          <Link
            href="/"
            className="text-3xl font-extrabold tracking-tighter text-primary mb-8 block"
          >
            Groupys
          </Link>

          <nav className="flex flex-col gap-1">
            {navItems.map((item) => {
              const active =
                pathname === item.href ||
                pathname.startsWith(item.href + "/");
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onClose}
                  className={
                    active
                      ? "flex items-center gap-3 px-6 py-3 text-primary font-bold bg-primary/5 rounded-xl"
                      : "flex items-center gap-3 px-6 py-3 text-slate-500 font-medium hover:bg-surface-container rounded-xl transition-colors"
                  }
                >
                  <span className="relative">
                    <span className="material-symbols-outlined">
                      {item.icon}
                    </span>
                    {item.href === "/feed" && hasUnansweredHotTake && (
                      <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-primary border-2 border-surface" />
                    )}
                  </span>
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
    </>
  );
}
