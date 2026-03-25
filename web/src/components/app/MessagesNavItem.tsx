"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useConversations } from "@/hooks/useConversations";
import { cn } from "@/lib/utils";

interface MessagesNavItemProps {
  onClose?: () => void;
}

export default function MessagesNavItem({ onClose }: MessagesNavItemProps) {
  const pathname = usePathname();
  const { conversations } = useConversations();
  const active = pathname === "/chat" || pathname.startsWith("/chat/");

  const totalUnread = conversations.reduce((sum, c) => sum + c.unreadCount, 0);

  return (
    <Link
      href="/chat"
      onClick={onClose}
      className={cn(
        "flex items-center gap-3 px-6 py-3 rounded-xl font-medium transition-colors",
        active
          ? "text-primary font-bold bg-primary/5"
          : "text-slate-500 hover:bg-surface-container"
      )}
    >
      <span className="material-symbols-outlined">chat</span>
      <span className="flex-1">Messages</span>
      {totalUnread > 0 && (
        <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-primary px-1.5 text-[11px] font-bold text-primary-foreground">
          {totalUnread > 99 ? "99+" : totalUnread}
        </span>
      )}
    </Link>
  );
}
