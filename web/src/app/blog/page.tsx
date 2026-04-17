import type { Metadata } from "next";
import Script from "next/script";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Blog",
  description: "News, updates, and stories from the Groupys team.",
  alternates: { canonical: "https://groupys.app/blog" },
  openGraph: {
    title: "Groupys Blog",
    description: "News, updates, and stories from the Groupys team.",
    url: "https://groupys.app/blog",
    type: "website",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "Blog",
  "@id": "https://groupys.app/blog#blog",
  url: "https://groupys.app/blog",
  name: "Groupys Blog",
  description: "News, updates, and stories from the Groupys team.",
  publisher: { "@id": "https://groupys.app/#organization" },
  isPartOf: { "@id": "https://groupys.app/#website" },
};

const posts = [
  {
    slug: "album-rating",
    category: "Music & Opinion",
    title: "How to Rate Albums the Right Way (And Why It Matters)",
    excerpt:
      "Star ratings don't tell the full story. Here's why the way you talk about music matters more than the number you slap on it.",
    date: "March 23, 2026",
    readTime: "6 min read",
  },
  {
    slug: "music-connection",
    category: "Community & Connection",
    title: "How to Find People Who Like the Same Music as You",
    excerpt:
      "Algorithms suggest songs. But they don't introduce you to the person across the city who cried to the same album last Tuesday.",
    date: "March 23, 2026",
    readTime: "7 min read",
  },
  {
    slug: "music-and-dating",
    category: "Music & Identity",
    title: "Why Music Taste Says More About You Than Any Dating Profile",
    excerpt:
      "Forget the curated selfies and the clever bios. Your playlist is the most honest thing about you — and science is starting to prove it.",
    date: "March 23, 2026",
    readTime: "8 min read",
  },
];

export default function BlogPage() {
  return (
    <>
      <Script
        id="blog-json-ld"
        type="application/ld+json"
        strategy="beforeInteractive"
      >
        {JSON.stringify(jsonLd)}
      </Script>
      <div className="min-h-screen bg-surface text-on-surface">
        <div className="max-w-3xl mx-auto px-6 py-24">
          <Link
            href="/"
            className="text-sm text-on-surface-variant hover:text-primary transition-colors mb-10 inline-block"
          >
            ← Back to home
          </Link>
          <p className="text-xs font-semibold uppercase tracking-widest text-primary mb-4">
            Blog
          </p>
          <h1 className="text-4xl font-black tracking-tight text-on-surface mb-4">
            News &amp; Stories
          </h1>
          <p className="text-on-surface-variant text-lg mb-16">
            Thoughts on music, community, and connection from the Groupys team.
          </p>

          <div className="space-y-6">
            {posts.map((post) => (
              <Link
                key={post.slug}
                href={`/blog/${post.slug}`}
                className="block group border border-outline-variant rounded-2xl p-8 hover:border-primary/50 hover:bg-surface-container-low transition-all"
              >
                <p className="text-xs font-semibold uppercase tracking-widest text-primary mb-3">
                  {post.category}
                </p>
                <h2 className="text-xl font-bold text-on-surface mb-3 group-hover:text-primary transition-colors">
                  {post.title}
                </h2>
                <p className="text-on-surface-variant text-sm leading-relaxed mb-5">
                  {post.excerpt}
                </p>
                <div className="flex items-center gap-3 text-xs text-on-surface-variant">
                  <span>{post.date}</span>
                  <span className="w-1 h-1 rounded-full bg-outline" />
                  <span>{post.readTime}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
