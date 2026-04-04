import ProtectedClerkProvider from "@/components/auth/ProtectedClerkProvider";
import ChatLayoutShell from "@/components/chat/ChatLayoutShell";

export default function ChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProtectedClerkProvider>
      <ChatLayoutShell>{children}</ChatLayoutShell>
    </ProtectedClerkProvider>
  );
}
