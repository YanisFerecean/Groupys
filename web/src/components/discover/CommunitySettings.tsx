"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import GeneralTab from "./settings/GeneralTab";
import MembersTab from "./settings/MembersTab";
import ModerationTab from "./settings/ModerationTab";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080/api";

interface CommunityRes {
  id: string;
  name: string;
  description: string | null;
  genre: string | null;
  country: string | null;
  imageUrl: string | null;
  bannerUrl: string | null;
  iconType: string | null;
  iconUrl: string | null;
  tags: string[];
  artistId?: number | null;
  memberCount: number;
  createdById: string;
  createdAt: string;
  blacklistedWords?: string[];
}

interface MemberRes {
  id: string;
  userId: string;
  username: string;
  displayName: string | null;
  profileImage: string | null;
  role: string;
  joinedAt: string;
}

export default function CommunitySettings({ id }: { id: string }) {
  const { getToken } = useAuth();
  const router = useRouter();
  const [community, setCommunity] = useState<CommunityRes | null>(null);
  const [members, setMembers] = useState<MemberRes[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const token = await getToken();
        const headers = { Authorization: `Bearer ${token}` };

        const [communityRes, membershipRes, membersRes] = await Promise.all([
          fetch(`${API_URL}/communities/${id}`, { headers }),
          fetch(`${API_URL}/communities/${id}/membership`, { headers }),
          fetch(`${API_URL}/communities/${id}/members`, { headers }),
        ]);

        if (!communityRes.ok) {
          router.replace(`/discover/community/${id}`);
          return;
        }

        const membershipData = membershipRes.ok ? await membershipRes.json() : {};
        if (!membershipData.owner) {
          toast.error("Only the community owner can access settings");
          router.replace(`/discover/community/${id}`);
          return;
        }

        const communityData: CommunityRes = await communityRes.json();
        const membersData: MemberRes[] = membersRes.ok ? await membersRes.json() : [];

        setCommunity(communityData);
        setMembers(membersData);
      } catch {
        router.replace(`/discover/community/${id}`);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 flex justify-center">
        <div className="w-10 h-10 rounded-full bg-surface-container-high animate-pulse" />
      </div>
    );
  }

  if (!community) return null;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <button
        onClick={() => router.push(`/discover/community/${id}`)}
        className="flex items-center gap-1.5 text-sm text-on-surface-variant hover:text-on-surface transition-colors mb-6"
      >
        <span className="material-symbols-outlined" style={{ fontSize: 18 }}>arrow_back</span>
        Back to community
      </button>

      <div className="mb-6">
        <h1 className="text-xl font-extrabold text-on-surface">{community.name}</h1>
        <p className="text-sm text-on-surface-variant mt-0.5">Community Settings</p>
      </div>

      <Tabs defaultValue="general">
        <TabsList className="w-full">
          <TabsTrigger value="general" className="flex-1">General</TabsTrigger>
          <TabsTrigger value="members" className="flex-1">
            Members
            <span className="ml-1.5 text-[10px] bg-surface-container px-1.5 py-0.5 rounded-full">
              {members.length}
            </span>
          </TabsTrigger>
          <TabsTrigger value="moderation" className="flex-1">Moderation</TabsTrigger>
        </TabsList>

        <TabsContent value="general">
          <GeneralTab community={community} onSaved={setCommunity} members={members} onMembersChange={setMembers} />
        </TabsContent>

        <TabsContent value="members">
          <MembersTab communityId={id} members={members} onMembersChange={setMembers} />
        </TabsContent>

        <TabsContent value="moderation">
          <ModerationTab community={community} onSaved={setCommunity} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
