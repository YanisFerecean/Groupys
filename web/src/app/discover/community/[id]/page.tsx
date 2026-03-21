import CommunityDetail from "@/components/discover/CommunityDetail";

interface CommunityPageProps {
  params: Promise<{ id: string }>;
}

export default async function CommunityPage({ params }: CommunityPageProps) {
  const { id } = await params;
  return <CommunityDetail id={id} />;
}
