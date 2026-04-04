import PublicProfileView from "@/components/profile/PublicProfileView";

interface Props {
  params: Promise<{ username: string }>;
}

export default async function DiscoverUserPage({ params }: Props) {
  const { username } = await params;
  return <PublicProfileView username={username} />;
}
