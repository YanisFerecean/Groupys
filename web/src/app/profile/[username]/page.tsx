import type { Metadata } from "next";
import PublicProfileView from "@/components/profile/PublicProfileView";

interface PublicProfilePageProps {
  params: Promise<{ username: string }>;
}

export async function generateMetadata({ params }: PublicProfilePageProps): Promise<Metadata> {
  const { username } = await params;
  return {
    title: `@${username}`,
    description: `Check out @${username}'s music profile on Groupys — ratings, communities, and weekly hot takes.`,
    alternates: { canonical: `https://groupys.app/profile/${username}` },
    openGraph: {
      title: `@${username} on Groupys`,
      description: `Check out @${username}'s music profile on Groupys — ratings, communities, and weekly hot takes.`,
      url: `https://groupys.app/profile/${username}`,
      type: "profile",
    },
    twitter: {
      card: "summary",
      title: `@${username} on Groupys`,
      description: `Check out @${username}'s music profile on Groupys — ratings, communities, and weekly hot takes.`,
    },
  };
}

export default async function PublicProfilePage({
  params,
}: PublicProfilePageProps) {
  const { username } = await params;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ProfilePage",
    "@id": `https://groupys.app/profile/${username}#profilepage`,
    url: `https://groupys.app/profile/${username}`,
    name: `@${username} on Groupys`,
    isPartOf: { "@id": "https://groupys.app/#website" },
    mainEntity: {
      "@type": "Person",
      "@id": `https://groupys.app/profile/${username}#person`,
      name: username,
      url: `https://groupys.app/profile/${username}`,
    },
  };

  return (
    <>
<script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
      <PublicProfileView username={username} />
    </>
  );
}
