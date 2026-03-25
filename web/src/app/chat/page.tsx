import { MessageCircle } from "lucide-react";

export default function ChatEmptyState() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-surface h-full">
      <div className="w-20 h-20 bg-surface-container rounded-full flex items-center justify-center mb-6">
        <MessageCircle className="w-10 h-10 text-on-surface-variant" />
      </div>
      <h2 className="text-2xl font-bold mb-2 text-on-surface">Your Messages</h2>
      <p className="text-on-surface-variant max-w-sm">
        Select a conversation from the sidebar or click the + icon to start a new chat with someone.
      </p>
    </div>
  );
}
