import type { Metadata } from "next";
import PostDetail from "@/components/discover/PostDetail";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080/api";

interface PostPageProps {
  params: Promise<{ id: string }>;
}

interface PostMeta {
  id: string;
  title: string | null;
  imageUrl: string | null;
  authorUsername: string | null;
  authorDisplayName: string | null;
  communityName: string | null;
}

async function fetchPostMeta(id: string): Promise<PostMeta | null> {
  try {
    const res = await fetch(`${API_URL}/posts/${id}/meta`, {
      // Public endpoint; cache briefly so crawlers don't hammer the API.
      next: { revalidate: 300 },
    });
    if (!res.ok) return null;
    return (await res.json()) as PostMeta;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: PostPageProps): Promise<Metadata> {
  const { id } = await params;
  const meta = await fetchPostMeta(id);
  const url = `https://groupys.app/discover/post/${id}`;

  const author =
    meta?.authorDisplayName?.trim() ||
    (meta?.authorUsername ? `@${meta.authorUsername}` : "Someone");
  const title = meta?.title?.trim() || `${author} on Groupys`;
  const description = meta?.communityName
    ? `${author} shared a post in ${meta.communityName} on Groupys.`
    : `${author} shared a post on Groupys.`;
  const imageAbsolute = meta?.imageUrl
    ? `${API_URL}${meta.imageUrl.replace(/^\/api/, "")}`
    : undefined;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      type: "article",
      ...(imageAbsolute ? { images: [{ url: imageAbsolute }] } : {}),
    },
    twitter: {
      card: imageAbsolute ? "summary_large_image" : "summary",
      title,
      description,
      ...(imageAbsolute ? { images: [imageAbsolute] } : {}),
    },
  };
}

export default async function PostPage({ params }: PostPageProps) {
  const { id } = await params;
  return <PostDetail id={id} />;
}
