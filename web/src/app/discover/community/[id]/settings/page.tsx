import type { Metadata } from "next";
import CommunitySettings from "@/components/discover/CommunitySettings";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

interface Props {
  params: Promise<{ id: string }>;
}

export default async function CommunitySettingsPage({ params }: Props) {
  const { id } = await params;
  return <CommunitySettings id={id} />;
}
