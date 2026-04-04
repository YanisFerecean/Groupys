export function TypingIndicator({ username }: { username?: string }) {
  return (
    <div className="flex flex-col space-y-1 w-fit">
      {username && (
        <span className="text-xs text-on-surface-variant ml-3">{username} is typing...</span>
      )}
      <div className="flex items-center space-x-1.5 px-4 py-3 bg-surface-container-high rounded-3xl rounded-bl-sm w-fit shadow-sm">
        <div className="w-2 h-2 bg-on-surface/40 rounded-full animate-bounce [animation-delay:-0.3s]" />
        <div className="w-2 h-2 bg-on-surface/40 rounded-full animate-bounce [animation-delay:-0.15s]" />
        <div className="w-2 h-2 bg-on-surface/40 rounded-full animate-bounce" />
      </div>
    </div>
  );
}
