import ProtectedClerkProvider from "@/components/auth/ProtectedClerkProvider";

export default function MatchLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ProtectedClerkProvider>{children}</ProtectedClerkProvider>;
}
