import type { Metadata } from "next";
import AlbumRatingPage from "@/components/album/AlbumRatingPage";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

interface AlbumPageProps {
  params: Promise<{ id: string }>;
}

export default async function DiscoverAlbumPage({ params }: AlbumPageProps) {
  const { id } = await params;
  return <AlbumRatingPage id={id} />;
}
