"use client";

import { useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { DropdownMenu } from "radix-ui";
import { MoreHorizontal, Flag, Ban } from "lucide-react";
import { toast } from "sonner";
import ReportDialog from "./ReportDialog";
import { blockUser, type ReportTargetType } from "@/lib/moderation-api";

interface ModerationMenuProps {
  targetType: ReportTargetType;
  targetId: string;
  targetLabel?: string;
  /** When set, a "Block user" action is shown that blocks this user id. */
  blockUserId?: string;
  /** Called after a successful block so the caller can refresh / navigate away. */
  onBlocked?: () => void;
  /** Optional className for the trigger button. */
  className?: string;
}

export default function ModerationMenu({
  targetType,
  targetId,
  targetLabel,
  blockUserId,
  onBlocked,
  className,
}: ModerationMenuProps) {
  const { getToken } = useAuth();
  const [reportOpen, setReportOpen] = useState(false);
  const [blocking, setBlocking] = useState(false);

  const handleBlock = async () => {
    if (!blockUserId || blocking) return;
    if (!window.confirm("Block this user? They'll be unmatched, hidden everywhere, and your conversation removed.")) {
      return;
    }
    setBlocking(true);
    try {
      const token = await getToken();
      await blockUser(blockUserId, token);
      toast.success("User blocked");
      onBlocked?.();
    } catch {
      toast.error("Couldn't block user", { description: "Please try again." });
    } finally {
      setBlocking(false);
    }
  };

  return (
    <>
      <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild>
          <button
            type="button"
            aria-label="More options"
            className={
              className ??
              "flex h-9 w-9 items-center justify-center rounded-full text-on-surface-variant hover:bg-surface-container transition-colors"
            }
          >
            <MoreHorizontal className="h-5 w-5" />
          </button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <DropdownMenu.Content
            align="end"
            sideOffset={6}
            className="z-50 min-w-44 rounded-xl border border-surface-container bg-surface-container-lowest p-1.5 shadow-lg"
          >
            <DropdownMenu.Item
              onSelect={() => setReportOpen(true)}
              className="flex cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-on-surface outline-none data-[highlighted]:bg-surface-container"
            >
              <Flag className="h-4 w-4" />
              Report
            </DropdownMenu.Item>
            {blockUserId && (
              <DropdownMenu.Item
                onSelect={handleBlock}
                disabled={blocking}
                className="flex cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-error outline-none data-[highlighted]:bg-error/10"
              >
                <Ban className="h-4 w-4" />
                {blocking ? "Blocking…" : "Block user"}
              </DropdownMenu.Item>
            )}
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>

      <ReportDialog
        open={reportOpen}
        onOpenChange={setReportOpen}
        targetType={targetType}
        targetId={targetId}
        targetLabel={targetLabel}
      />
    </>
  );
}
