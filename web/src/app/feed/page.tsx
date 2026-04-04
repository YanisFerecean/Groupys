import type { Metadata } from "next";
import FeedContent from "@/components/feed/FeedContent";
import FeedSidebar from "@/components/feed/FeedSidebar";

export const metadata: Metadata = {
  title: "Feed",
  robots: { index: false, follow: false },
};

export default function FeedPage() {
  return (
    <div className="flex">
      <FeedContent />
      <FeedSidebar />
    </div>
  );
}
