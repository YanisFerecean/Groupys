import type { Metadata } from "next";
import FeedContent from "@/components/feed/FeedContent";

export const metadata: Metadata = {
  title: "Feed",
  robots: { index: false, follow: false },
};
import FeedSidebar from "@/components/feed/FeedSidebar";
import PlayerBar from "@/components/feed/PlayerBar";

export default function FeedPage() {
  return (
    <>
      <div className="flex">
        <FeedContent />
        <FeedSidebar />
      </div>
      <PlayerBar />
    </>
  );
}
