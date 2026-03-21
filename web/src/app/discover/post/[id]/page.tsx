import PostDetail from "@/components/discover/PostDetail";

interface PostPageProps {
  params: Promise<{ id: string }>;
}

export default async function PostPage({ params }: PostPageProps) {
  const { id } = await params;
  return <PostDetail id={id} />;
}
