export function TypingIndicator({ username }: { username?: string }) {
  return (
    <div className="flex flex-col space-y-1 w-fit">
      {username && <span className="text-xs text-muted-foreground ml-2">{username} is typing...</span>}
      <div className="flex items-center space-x-1.5 p-3 px-4 bg-muted/50 rounded-2xl w-fit">
        <div className="w-1.5 h-1.5 bg-foreground/50 rounded-full animate-bounce [animation-delay:-0.3s]" />
        <div className="w-1.5 h-1.5 bg-foreground/50 rounded-full animate-bounce [animation-delay:-0.15s]" />
        <div className="w-1.5 h-1.5 bg-foreground/50 rounded-full animate-bounce" />
      </div>
    </div>
  );
}
