"use client";

import Link from "next/link";
import { useConversations } from "@/hooks/useConversations";

export default function DmButton() {
  const { conversations } = useConversations();
  const totalUnread = conversations.reduce((sum, c) => sum + c.unreadCount, 0);

  return (
    <Link
      href="/chat"
      className="relative text-slate-500 hover:text-slate-800 transition-colors"
      aria-label="Messages"
    >
      <span className="material-symbols-outlined">chat</span>
      {totalUnread > 0 && (
        <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-on-primary">
          {totalUnread > 99 ? "99+" : totalUnread}
        </span>
      )}
    </Link>
  );
}
