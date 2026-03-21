import ArtistDetail from "@/components/discover/ArtistDetail";

interface ArtistPageProps {
  params: Promise<{ id: string }>;
}

export default async function ArtistPage({ params }: ArtistPageProps) {
  const { id } = await params;
  return <ArtistDetail id={id} />;
}
