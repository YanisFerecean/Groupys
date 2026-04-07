"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

const tabs = [
  { id: "overview", label: "Overview", icon: "grid_view" },
  { id: "posts",    label: "Posts",    icon: "article"   },
  { id: "likes",    label: "Likes",    icon: "thumb_up"  },
  { id: "communities", label: "Communities", icon: "group" },
];

export default function ProfileRightSidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeTab = searchParams.get("tab") ?? "overview";

  if (pathname !== "/profile") return null;

  return (
    <aside className="hidden lg:flex flex-col w-52 fixed right-0 top-16 lg:top-20 bottom-0 bg-surface border-l border-surface-container z-30">
      <div className="flex flex-col h-full p-4 pt-6">
        <nav className="flex flex-col gap-1">
          {tabs.map((tab) => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => router.replace(tab.id === "overview" ? "/profile" : `/profile?tab=${tab.id}`, { scroll: false })}
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
                  {tab.icon}
                </span>
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}
