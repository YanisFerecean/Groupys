import PublicProfileView from "@/components/profile/PublicProfileView";

interface PublicProfilePageProps {
  params: Promise<{ username: string }>;
}

export default async function PublicProfilePage({
  params,
}: PublicProfilePageProps) {
  const { username } = await params;
  return <PublicProfileView username={username} />;
}
