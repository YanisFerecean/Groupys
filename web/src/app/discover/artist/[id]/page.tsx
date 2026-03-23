import type { Metadata } from "next";
import ArtistDetail from "@/components/discover/ArtistDetail";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

interface ArtistPageProps {
  params: Promise<{ id: string }>;
}

export default async function ArtistPage({ params }: ArtistPageProps) {
  const { id } = await params;
  return <ArtistDetail id={id} />;
}
