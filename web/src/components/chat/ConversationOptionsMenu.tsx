"use client";

import { useState } from "react";
import { DropdownMenu } from "radix-ui";
import { Ban, Bell, BellOff, Flag, MoreHorizontal } from "lucide-react";
import { useAuth } from "@clerk/nextjs";
import { toast } from "sonner";
import ReportDialog from "@/components/moderation/ReportDialog";
import { blockUser } from "@/lib/moderation-api";

interface ConversationOptionsMenuProps {
  /** ISO timestamp the conversation is muted until (null/undefined when not muted). */
  mutedUntil?: string | null;
  onMuteUntil: (until: string | null) => Promise<void> | void;
  /** The other participant (direct chats) — enables report / block. */
  partner?: { userId: string; label: string } | null;
  onBlocked?: () => void;
}

const MUTE_OPTIONS = [
  { label: "Mute for 1 hour", hours: 1 },
  { label: "Mute for 8 hours", hours: 8 },
  { label: "Mute for 1 week", hours: 24 * 7 },
];

function muteUntil(hours: number): string {
  return new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
}

/** Header "…" menu: notification mute controls plus safety actions (mirrors mobile's options sheet). */
export function ConversationOptionsMenu({ mutedUntil, onMuteUntil, partner, onBlocked }: ConversationOptionsMenuProps) {
  const { getToken } = useAuth();
  const [reportOpen, setReportOpen] = useState(false);
  const [blocking, setBlocking] = useState(false);
  const muted = !!mutedUntil && new Date(mutedUntil).getTime() > Date.now();

  const item =
    "flex cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-on-surface outline-none data-[highlighted]:bg-surface-container data-[disabled]:opacity-50";

  const applyMute = async (until: string | null) => {
    try {
      await onMuteUntil(until);
      toast.success(until ? "Notifications muted" : "Notifications unmuted");
    } catch {
      toast.error("Couldn't update notifications");
    }
  };

  const handleBlock = async () => {
    if (!partner || blocking) return;
    if (!window.confirm(`Block ${partner.label}? They'll be unmatched, hidden everywhere, and this conversation removed.`)) {
      return;
    }
    setBlocking(true);
    try {
      const token = await getToken();
      await blockUser(partner.userId, token);
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
            aria-label="Conversation options"
            title="Conversation options"
            className={`p-2 rounded-full hover:bg-surface-container transition-colors ${
              muted ? "text-primary" : "text-on-surface-variant"
            }`}
          >
            {muted ? <BellOff className="w-5 h-5" /> : <MoreHorizontal className="w-5 h-5" />}
          </button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <DropdownMenu.Content
            align="end"
            sideOffset={6}
            className="z-50 min-w-52 rounded-xl border border-surface-container bg-surface-container-lowest p-1.5 shadow-lg"
          >
            <DropdownMenu.Label className="px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide text-on-surface-variant">
              Notifications
            </DropdownMenu.Label>
            {muted && (
              <DropdownMenu.Item onSelect={() => void applyMute(null)} className={`${item} text-primary`}>
                <Bell className="h-4 w-4" />
                Unmute notifications
              </DropdownMenu.Item>
            )}
            {MUTE_OPTIONS.map((opt) => (
              <DropdownMenu.Item key={opt.hours} onSelect={() => void applyMute(muteUntil(opt.hours))} className={item}>
                <BellOff className="h-4 w-4" />
                {opt.label}
              </DropdownMenu.Item>
            ))}

            {partner && (
              <>
                <DropdownMenu.Separator className="my-1 h-px bg-surface-container" />
                <DropdownMenu.Label className="px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide text-on-surface-variant">
                  Safety
                </DropdownMenu.Label>
                <DropdownMenu.Item onSelect={() => setReportOpen(true)} className={item}>
                  <Flag className="h-4 w-4" />
                  Report {partner.label}
                </DropdownMenu.Item>
                <DropdownMenu.Item
                  onSelect={handleBlock}
                  disabled={blocking}
                  className={`${item} text-error data-[highlighted]:bg-error/10`}
                >
                  <Ban className="h-4 w-4" />
                  {blocking ? "Blocking…" : "Block user"}
                </DropdownMenu.Item>
              </>
            )}
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>

      {partner && (
        <ReportDialog
          open={reportOpen}
          onOpenChange={setReportOpen}
          targetType="USER"
          targetId={partner.userId}
          targetLabel={partner.label}
        />
      )}
    </>
  );
}
