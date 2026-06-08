"use client";

import { useState, useEffect } from "react";
import { useAuth, useClerk } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  getOwnedCommunities,
  deleteAccount,
  transferCommunityOwner,
  deleteCommunity,
  type OwnedCommunity,
} from "@/lib/api";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080/api";

interface MemberRes {
  id: string;
  userId: string;
  username: string;
  displayName: string | null;
  profileImage: string | null;
  role: string;
}

interface DeleteAccountModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  username: string;
}

type Step = "loading" | "communities" | "confirm" | "deleting";
type CommunityAction = "transfer" | "delete" | null;

interface MemberPickerProps {
  members: MemberRes[];
  loading: boolean;
  selected: string | null;
  onSelect: (userId: string) => void;
  onBack: () => void;
  onConfirm: () => void;
  confirming: boolean;
}

function MemberPicker({ members, loading, selected, onSelect, onBack, onConfirm, confirming }: MemberPickerProps) {
  const [search, setSearch] = useState("");
  const filtered = search.trim()
    ? members.filter((m) => {
        const q = search.toLowerCase();
        return m.username.toLowerCase().includes(q) || (m.displayName ?? "").toLowerCase().includes(q);
      })
    : members;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-4">
        <span className="w-5 h-5 border-2 border-on-surface/20 border-t-on-surface rounded-full animate-spin" />
      </div>
    );
  }

  if (members.length === 0) {
    return (
      <div className="space-y-2">
        <p className="text-xs text-on-surface-variant text-center py-3">
          No other members to transfer to. You must delete this community.
        </p>
        <button
          onClick={onBack}
          className="w-full py-2 rounded-xl text-xs font-semibold text-on-surface-variant hover:bg-surface-container-high transition-colors"
        >
          Back
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Search */}
      <div className="flex items-center gap-2 bg-surface-container-high rounded-xl px-3 py-2 focus-within:ring-2 focus-within:ring-primary/30 transition-shadow">
        <span className="material-symbols-outlined text-on-surface-variant shrink-0" style={{ fontSize: 16 }}>search</span>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search members…"
          className="flex-1 bg-transparent border-none outline-none text-xs text-on-surface placeholder:text-outline"
        />
        {search && (
          <button onClick={() => setSearch("")} className="text-on-surface-variant hover:text-on-surface transition-colors">
            <span className="material-symbols-outlined" style={{ fontSize: 14 }}>close</span>
          </button>
        )}
      </div>

      {/* Member list */}
      <div className="max-h-44 overflow-y-auto space-y-1 pr-0.5">
        {filtered.length === 0 ? (
          <p className="text-xs text-on-surface-variant text-center py-3">No members match your search.</p>
        ) : (
          filtered.map((m) => {
            const isSelected = selected === m.userId;
            const avatarSrc = m.profileImage
              ? (m.profileImage.startsWith("http") ? m.profileImage : `${API_URL}${m.profileImage.replace(/^\/api/, "")}`)
              : null;
            return (
              <button
                key={m.userId}
                onClick={() => onSelect(m.userId)}
                className={`w-full flex items-center gap-3 p-2.5 rounded-xl transition-colors text-left ${
                  isSelected
                    ? "bg-primary/10 ring-1 ring-primary/30"
                    : "hover:bg-surface-container-high"
                }`}
              >
                <div className="w-8 h-8 rounded-full overflow-hidden bg-surface-container-high shrink-0 flex items-center justify-center">
                  {avatarSrc ? (
                    <Image src={avatarSrc} alt={m.displayName || m.username} width={32} height={32} className="w-full h-full object-cover" />
                  ) : (
                    <span className="material-symbols-outlined text-on-surface-variant" style={{ fontSize: 16 }}>person</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-on-surface truncate leading-tight">
                    {m.displayName || m.username}
                  </p>
                  <p className="text-xs text-on-surface-variant truncate">@{m.username}</p>
                </div>
                {m.role === "admin" && (
                  <span className="text-[10px] font-bold text-secondary bg-secondary/10 px-2 py-0.5 rounded-full uppercase tracking-wider shrink-0">
                    Admin
                  </span>
                )}
                {isSelected && (
                  <span className="material-symbols-outlined text-primary shrink-0" style={{ fontSize: 18, fontVariationSettings: "'FILL' 1" }}>
                    check_circle
                  </span>
                )}
              </button>
            );
          })
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-1">
        <button
          onClick={onBack}
          className="flex-1 py-2 rounded-xl text-xs font-semibold text-on-surface-variant hover:bg-surface-container-high transition-colors"
        >
          Back
        </button>
        <button
          onClick={onConfirm}
          disabled={!selected || confirming}
          className="flex-1 py-2 rounded-xl text-xs font-semibold bg-primary text-on-primary disabled:opacity-40 hover:brightness-110 transition-all"
        >
          {confirming ? "Transferring…" : "Confirm Transfer"}
        </button>
      </div>
    </div>
  );
}

export default function DeleteAccountModal({
  open,
  onOpenChange,
  username,
}: DeleteAccountModalProps) {
  const { getToken } = useAuth();
  const { signOut } = useClerk();
  const router = useRouter();

  const [step, setStep] = useState<Step>("loading");
  const [ownedCommunities, setOwnedCommunities] = useState<OwnedCommunity[]>([]);
  const [communityAction, setCommunityAction] = useState<Record<string, CommunityAction>>({});
  const [transferTarget, setTransferTarget] = useState<Record<string, string>>({});
  const [members, setMembers] = useState<Record<string, MemberRes[]>>({});
  const [loadingMembers, setLoadingMembers] = useState<Record<string, boolean>>({});
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [confirmInput, setConfirmInput] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setStep("loading");
      setOwnedCommunities([]);
      setCommunityAction({});
      setTransferTarget({});
      setMembers({});
      setConfirmInput("");
      setError(null);
      return;
    }
    (async () => {
      try {
        const token = await getToken();
        const owned = await getOwnedCommunities(token);
        setOwnedCommunities(owned);
        setStep(owned.length > 0 ? "communities" : "confirm");
      } catch {
        setError("Failed to load account data. Please try again.");
        setStep("confirm");
      }
    })();
  }, [open, getToken]);

  async function loadMembers(communityId: string) {
    if (members[communityId]) return;
    setLoadingMembers((prev) => ({ ...prev, [communityId]: true }));
    try {
      const token = await getToken();
      const res = await fetch(`${API_URL}/communities/${communityId}/members`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data: MemberRes[] = await res.json();
        setMembers((prev) => ({
          ...prev,
          [communityId]: data.filter((m) => m.role !== "owner"),
        }));
      }
    } finally {
      setLoadingMembers((prev) => ({ ...prev, [communityId]: false }));
    }
  }

  function pickAction(communityId: string, action: CommunityAction) {
    setCommunityAction((prev) => ({ ...prev, [communityId]: action }));
    if (action === "transfer") {
      loadMembers(communityId);
    }
  }

  async function handleTransfer(communityId: string) {
    const newOwnerId = transferTarget[communityId];
    if (!newOwnerId) return;
    setProcessingId(communityId);
    setError(null);
    try {
      const token = await getToken();
      await transferCommunityOwner(communityId, newOwnerId, token);
      const remaining = ownedCommunities.filter((c) => c.id !== communityId);
      setOwnedCommunities(remaining);
      if (remaining.length === 0) setStep("confirm");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Transfer failed.");
    } finally {
      setProcessingId(null);
    }
  }

  async function handleDeleteCommunity(communityId: string) {
    setProcessingId(communityId);
    setError(null);
    try {
      const token = await getToken();
      await deleteCommunity(communityId, token);
      const remaining = ownedCommunities.filter((c) => c.id !== communityId);
      setOwnedCommunities(remaining);
      if (remaining.length === 0) setStep("confirm");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Deletion failed.");
    } finally {
      setProcessingId(null);
    }
  }

  async function handleDeleteAccount() {
    if (confirmInput !== username) return;
    setStep("deleting");
    setError(null);
    try {
      const token = await getToken();
      await deleteAccount(token);
      await signOut();
      router.push("/");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete account.");
      setStep("confirm");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-0 overflow-hidden rounded-3xl">
        <div className="px-7 pt-7 pb-2">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold tracking-tight text-error">
              Delete Account
            </DialogTitle>
          </DialogHeader>
        </div>

        <div className="px-7 pb-7 space-y-5">
          {step === "loading" && (
            <div className="flex items-center justify-center py-8">
              <span className="w-6 h-6 border-2 border-on-surface/20 border-t-on-surface rounded-full animate-spin" />
            </div>
          )}

          {step === "communities" && (
            <>
              <p className="text-sm text-on-surface-variant leading-relaxed">
                You own {ownedCommunities.length === 1 ? "a community" : `${ownedCommunities.length} communities`}. Before deleting your account, you must either transfer ownership or delete each community.
              </p>

              <div className="space-y-3">
                {ownedCommunities.map((community) => {
                  const action = communityAction[community.id] ?? null;
                  const isProcessing = processingId === community.id;

                  return (
                    <div key={community.id} className="rounded-2xl bg-surface-container-low p-4 space-y-3">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{community.iconEmoji ?? "🌐"}</span>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-on-surface text-sm truncate">{community.name}</p>
                          <p className="text-xs text-on-surface-variant">{community.memberCount} members</p>
                        </div>
                      </div>

                      {action === null && (
                        <div className="flex gap-2">
                          <button
                            onClick={() => pickAction(community.id, "transfer")}
                            className="flex-1 py-2 rounded-xl text-xs font-semibold border border-primary/30 text-primary hover:bg-primary/10 transition-colors"
                          >
                            Transfer Ownership
                          </button>
                          <button
                            onClick={() => pickAction(community.id, "delete")}
                            className="flex-1 py-2 rounded-xl text-xs font-semibold border border-error/30 text-error hover:bg-error/10 transition-colors"
                          >
                            Delete Community
                          </button>
                        </div>
                      )}

                      {action === "transfer" && (
                        <MemberPicker
                          members={members[community.id] ?? []}
                          loading={!!loadingMembers[community.id]}
                          selected={transferTarget[community.id] ?? null}
                          onSelect={(userId) =>
                            setTransferTarget((prev) => ({ ...prev, [community.id]: userId }))
                          }
                          onBack={() => pickAction(community.id, null)}
                          onConfirm={() => handleTransfer(community.id)}
                          confirming={isProcessing}
                        />
                      )}

                      {action === "delete" && (
                        <div className="space-y-2">
                          <p className="text-xs text-error/80 leading-relaxed">
                            This will permanently delete <strong>{community.name}</strong> and all its posts, comments, and media.
                          </p>
                          <div className="flex gap-2">
                            <button
                              onClick={() => pickAction(community.id, null)}
                              className="flex-1 py-2 rounded-xl text-xs font-semibold text-on-surface-variant hover:bg-surface-container-high transition-colors"
                            >
                              Back
                            </button>
                            <button
                              onClick={() => handleDeleteCommunity(community.id)}
                              disabled={isProcessing}
                              className="flex-1 py-2 rounded-xl text-xs font-semibold bg-error text-white disabled:opacity-40 hover:brightness-110 transition-all"
                            >
                              {isProcessing ? "Deleting…" : "Delete Community"}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {error && <p className="text-xs text-error">{error}</p>}
            </>
          )}

          {(step === "confirm" || step === "deleting") && (
            <>
              <div className="space-y-4">
                <div className="rounded-2xl bg-surface-container-low p-4 space-y-2 text-sm">
                  <p className="font-semibold text-on-surface mb-1">What happens when you delete your account:</p>
                  <div className="flex items-start gap-2 text-on-surface-variant">
                    <span className="material-symbols-outlined text-on-surface-variant/60 mt-0.5" style={{ fontSize: 16 }}>keep</span>
                    <span><strong className="text-on-surface">Posts & comments</strong> remain visible under "Deleted User"</span>
                  </div>
                  <div className="flex items-start gap-2 text-error/80">
                    <span className="material-symbols-outlined mt-0.5" style={{ fontSize: 16 }}>delete_forever</span>
                    <span>All <strong>messages</strong> are permanently deleted</span>
                  </div>
                  <div className="flex items-start gap-2 text-error/80">
                    <span className="material-symbols-outlined mt-0.5" style={{ fontSize: 16 }}>delete_forever</span>
                    <span>All <strong>friend connections</strong> are removed</span>
                  </div>
                  <div className="flex items-start gap-2 text-error/80">
                    <span className="material-symbols-outlined mt-0.5" style={{ fontSize: 16 }}>delete_forever</span>
                    <span>Your <strong>profile, music history, and settings</strong> are deleted</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-sm text-on-surface-variant">
                    To confirm, type your username{" "}
                    <span className="font-bold text-on-surface">@{username}</span> below:
                  </p>
                  <Input
                    value={confirmInput}
                    onChange={(e) => setConfirmInput(e.target.value)}
                    placeholder={username}
                    disabled={step === "deleting"}
                    className="rounded-xl"
                  />
                </div>

                {error && <p className="text-xs text-error">{error}</p>}

                <button
                  onClick={handleDeleteAccount}
                  disabled={confirmInput !== username || step === "deleting"}
                  className="w-full py-3 rounded-2xl text-sm font-bold bg-error text-white disabled:opacity-40 hover:brightness-110 active:scale-[0.98] transition-all"
                >
                  {step === "deleting" ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Deleting account…
                    </span>
                  ) : (
                    "Delete my account permanently"
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
