"use client";

import { useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  REPORT_REASONS,
  reportContent,
  type ReportReason,
  type ReportTargetType,
} from "@/lib/moderation-api";

interface ReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetType: ReportTargetType;
  targetId: string;
  /** Short label for the entity being reported, shown in the dialog copy. */
  targetLabel?: string;
}

export default function ReportDialog({
  open,
  onOpenChange,
  targetType,
  targetId,
  targetLabel,
}: ReportDialogProps) {
  const { getToken } = useAuth();
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [details, setDetails] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const reset = () => {
    setReason(null);
    setDetails("");
    setSubmitting(false);
  };

  const handleSubmit = async () => {
    if (!reason || submitting) return;
    setSubmitting(true);
    try {
      const token = await getToken();
      await reportContent(
        { targetType, targetId, reason, details: details.trim() || undefined },
        token,
      );
      toast.success("Report submitted", {
        description: "Thanks — our team will review it.",
      });
      onOpenChange(false);
      reset();
    } catch {
      toast.error("Couldn't submit report", { description: "Please try again." });
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) reset();
      }}
    >
      <DialogContent className="max-w-md rounded-3xl">
        <DialogHeader>
          <DialogTitle>Report {targetLabel ?? targetType.toLowerCase()}</DialogTitle>
          <DialogDescription>
            Tell us what&apos;s wrong. Reports are confidential and reviewed by our team.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-1.5">
          {REPORT_REASONS.map((r) => (
            <button
              key={r.value}
              type="button"
              onClick={() => setReason(r.value)}
              className={
                reason === r.value
                  ? "flex w-full items-center justify-between rounded-xl border border-primary bg-primary/5 px-4 py-3 text-sm font-semibold text-primary transition-colors"
                  : "flex w-full items-center justify-between rounded-xl border border-surface-container px-4 py-3 text-sm font-medium text-on-surface hover:bg-surface-container transition-colors"
              }
            >
              {r.label}
              {reason === r.value && (
                <span className="material-symbols-outlined text-base">check_circle</span>
              )}
            </button>
          ))}
        </div>

        <Textarea
          value={details}
          onChange={(e) => setDetails(e.target.value)}
          placeholder="Add any details (optional)"
          maxLength={2000}
          className="min-h-24 resize-none rounded-xl"
        />

        <button
          type="button"
          onClick={handleSubmit}
          disabled={!reason || submitting}
          className="w-full rounded-2xl bg-primary py-3 text-sm font-bold text-on-primary transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-50"
        >
          {submitting ? "Submitting…" : "Submit report"}
        </button>
      </DialogContent>
    </Dialog>
  );
}
