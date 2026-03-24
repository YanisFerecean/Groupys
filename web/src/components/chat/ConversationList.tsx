"use client";

import Link from "next/link";
import { formatDistanceToNowStrict } from "date-fns";
import { Conversation, Participant } from "@/types/chat";
import { useUser } from "@clerk/nextjs";

interface ConversationListProps {
  conversations: Conversation[];
  activeId?: string;
}

export function ConversationList({ conversations, activeId }: ConversationListProps) {
  const { user } = useUser();

  if (conversations.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-4 text-center">
        <p className="text-on-surface-variant text-sm">No conversations yet.</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto w-full custom-scrollbar">
      {conversations.map((convo) => {
        // Find the "other" person in a 1-on-1
        const otherParticipant = convo.participants.find(
          (p) => p.username !== user?.username
        );

        const displayName = convo.isGroup
          ? convo.groupName || "Group Chat"
          : otherParticipant?.displayName || otherParticipant?.username || "Unknown User";

        const profileImage = convo.isGroup
          ? null // Could add group avatar later
          : otherParticipant?.profileImage;

        const timeAgo = convo.lastMessageAt
          ? formatDistanceToNowStrict(new Date(convo.lastMessageAt), { addSuffix: true })
          : null;

        const isActive = activeId === convo.id;

        return (
          <Link
            key={convo.id}
            href={`/chat/${convo.id}`}
            className={`flex items-center gap-3 p-3 w-full border-b border-surface-container-high transition-colors hover:bg-surface-container ${
              isActive ? "bg-surface-container font-medium" : ""
            }`}
          >
            {/* Avatar */}
            <div className="flex-shrink-0 relative">
              {profileImage ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={profileImage}
                  alt={displayName}
                  className="w-12 h-12 rounded-full object-cover bg-surface-container"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-primary/20 text-primary flex items-center justify-center font-semibold text-lg uppercase">
                  {displayName.charAt(0)}
                </div>
              )}
              {convo.unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-on-primary border-2 border-surface">
                  {convo.unreadCount > 99 ? "99+" : convo.unreadCount}
                </span>
              )}
            </div>

            {/* Details */}
            <div className="flex-1 min-w-0 flex flex-col justify-center">
              <div className="flex justify-between items-baseline mb-0.5">
                <h3 className="truncate font-semibold text-on-surface text-sm">
                  {displayName}
                </h3>
                {timeAgo && (
                  <span className="text-xs text-on-surface-variant flex-shrink-0 ml-2">
                    {timeAgo}
                  </span>
                )}
              </div>
              <p className={`truncate text-sm ${convo.unreadCount > 0 ? "text-on-surface font-medium" : "text-on-surface-variant"}`}>
                {convo.lastMessage || "Start a conversation..."}
              </p>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
