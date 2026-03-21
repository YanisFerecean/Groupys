import FeedContent from "@/components/feed/FeedContent";
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
