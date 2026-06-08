"use client";

import { useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { toast } from "sonner";
import Image from "next/image";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080/api";

interface MemberRes {
  id: string;
  userId: string;
  username: string;
  displayName: string | null;
  profileImage: string | null;
  role: string;
  joinedAt: string;
}

interface MembersTabProps {
  communityId: string;
  members: MemberRes[];
  onMembersChange: (members: MemberRes[]) => void;
}

function timeAgo(iso: string) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

export default function MembersTab({ communityId, members, onMembersChange }: MembersTabProps) {
  const { getToken } = useAuth();
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const updateRole = async (member: MemberRes, newRole: "admin" | "member") => {
    setLoadingId(member.userId);
    const prev = members;
    onMembersChange(members.map((m) => m.userId === member.userId ? { ...m, role: newRole } : m));
    try {
      const token = await getToken();
      const res = await fetch(`${API_URL}/communities/${communityId}/members/${member.userId}/role`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ role: newRole }),
      });
      if (!res.ok) throw new Error("Failed to update role");
      toast.success(newRole === "admin" ? `${member.displayName || member.username} is now an admin` : `${member.displayName || member.username} is now a member`);
    } catch {
      onMembersChange(prev);
      toast.error("Failed to update role");
    } finally {
      setLoadingId(null);
    }
  };

  const removeMember = async (member: MemberRes) => {
    if (!confirm(`Remove ${member.displayName || member.username} from the community?`)) return;
    setLoadingId(member.userId);
    const prev = members;
    onMembersChange(members.filter((m) => m.userId !== member.userId));
    try {
      const token = await getToken();
      const res = await fetch(`${API_URL}/communities/${communityId}/members/${member.userId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to remove member");
      toast.success(`${member.displayName || member.username} removed`);
    } catch {
      onMembersChange(prev);
      toast.error("Failed to remove member");
    } finally {
      setLoadingId(null);
    }
  };

  const filtered = search.trim()
    ? members.filter((m) => {
        const q = search.toLowerCase();
        return (
          m.username.toLowerCase().includes(q) ||
          (m.displayName ?? "").toLowerCase().includes(q)
        );
      })
    : members;

  if (!members.length) {
    return (
      <div className="flex flex-col items-center py-16 gap-2 text-on-surface-variant">
        <span className="material-symbols-outlined text-4xl">group</span>
        <p className="text-sm font-medium">No members yet</p>
      </div>
    );
  }

  return (
    <div className="py-4 space-y-2">
      <div className="flex items-center gap-2 bg-surface-container-high rounded-xl px-3 py-2 mb-2 focus-within:ring-2 focus-within:ring-primary/30 transition-shadow">
        <span className="material-symbols-outlined text-on-surface-variant shrink-0" style={{ fontSize: 18 }}>search</span>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search members…"
          className="flex-1 bg-transparent border-none outline-none text-sm text-on-surface placeholder:text-outline"
        />
        {search && (
          <button onClick={() => setSearch("")} className="text-on-surface-variant hover:text-on-surface transition-colors">
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>close</span>
          </button>
        )}
      </div>

      {filtered.length === 0 && (
        <p className="text-sm text-on-surface-variant text-center py-8">No members match your search.</p>
      )}

      {filtered.map((m) => {
        const isLoading = loadingId === m.userId;
        const profileImage = m.profileImage;
        const avatarSrc = profileImage
          ? (profileImage.startsWith("http") ? profileImage : `${API_URL}${profileImage.replace(/^\/api/, "")}`)
          : null;

        return (
          <div key={m.userId} className="flex items-center gap-3 p-3 rounded-2xl bg-surface-container-low hover:bg-surface-container-high/50 transition-colors">
            <div className="w-9 h-9 rounded-full overflow-hidden bg-surface-container-high shrink-0 flex items-center justify-center">
              {avatarSrc ? (
                <Image src={avatarSrc} alt={m.displayName || m.username} width={36} height={36} className="w-full h-full object-cover" />
              ) : (
                <span className="material-symbols-outlined text-on-surface-variant text-sm">person</span>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-on-surface truncate">
                  {m.displayName || m.username}
                </p>
                {m.role === "owner" && (
                  <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full uppercase tracking-wider shrink-0">
                    Owner
                  </span>
                )}
                {m.role === "admin" && (
                  <span className="text-[10px] font-bold text-secondary bg-secondary/10 px-2 py-0.5 rounded-full uppercase tracking-wider shrink-0">
                    Admin
                  </span>
                )}
              </div>
              <p className="text-xs text-on-surface-variant">@{m.username} · joined {timeAgo(m.joinedAt)}</p>
            </div>

            {m.role !== "owner" && (
              <div className="flex items-center gap-1.5 shrink-0">
                {m.role === "member" ? (
                  <button
                    onClick={() => updateRole(m, "admin")}
                    disabled={isLoading}
                    className="text-xs font-semibold px-3 py-1.5 rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors disabled:opacity-50"
                    title="Promote to Admin"
                  >
                    {isLoading ? "…" : "Make Admin"}
                  </button>
                ) : (
                  <button
                    onClick={() => updateRole(m, "member")}
                    disabled={isLoading}
                    className="text-xs font-semibold px-3 py-1.5 rounded-full bg-surface-container text-on-surface-variant hover:bg-surface-container-high transition-colors disabled:opacity-50"
                    title="Demote to Member"
                  >
                    {isLoading ? "…" : "Demote"}
                  </button>
                )}
                <button
                  onClick={() => removeMember(m)}
                  disabled={isLoading}
                  className="w-7 h-7 rounded-full flex items-center justify-center text-error hover:bg-error/10 transition-colors disabled:opacity-50"
                  title="Remove member"
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 16 }}>person_remove</span>
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
