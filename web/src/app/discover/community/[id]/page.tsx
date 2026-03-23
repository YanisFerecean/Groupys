import type { Metadata } from "next";
import CommunityDetail from "@/components/discover/CommunityDetail";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

interface CommunityPageProps {
  params: Promise<{ id: string }>;
}

export default async function CommunityPage({ params }: CommunityPageProps) {
  const { id } = await params;
  return <CommunityDetail id={id} />;
}
