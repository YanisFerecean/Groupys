"use client";

import { useState } from "react";
import SideNav from "@/components/app/SideNav";
import TopBar from "@/components/app/TopBar";
import SearchOverlay from "@/components/discover/SearchOverlay";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  return (
    <div className="bg-surface text-on-surface min-h-screen">
      <SideNav open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <TopBar
        onMenuClick={() => setSidebarOpen(true)}
        onSearchClick={() => setSearchOpen(true)}
      />
      <main className="lg:ml-64 pt-16 lg:pt-20 min-h-screen">{children}</main>
      {searchOpen && <SearchOverlay onClose={() => setSearchOpen(false)} />}
    </div>
  );
}
