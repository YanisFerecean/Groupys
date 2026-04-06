import { MessageCircle } from "lucide-react";

export default function ChatEmptyState() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-surface h-full">
      <div className="w-24 h-24 rounded-full bg-primary/8 flex items-center justify-center mb-6">
        <div className="w-16 h-16 rounded-full bg-primary/15 flex items-center justify-center">
          <MessageCircle className="w-8 h-8 text-primary" />
        </div>
      </div>
      <h2 className="text-2xl font-bold mb-2 text-on-surface">Start a conversation</h2>
      <p className="text-on-surface-variant text-sm max-w-xs">
        Choose a chat from the sidebar, or tap the + icon to message someone new.
      </p>
      <p className="hidden md:block mt-6 text-xs text-on-surface-variant/60">← Select a conversation to begin</p>
    </div>
  );
}
