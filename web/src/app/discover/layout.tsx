import AppShell from "@/components/app/AppShell";
import ProtectedClerkProvider from "@/components/auth/ProtectedClerkProvider";
import "./prose.css";

export default function DiscoverLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProtectedClerkProvider>
      <AppShell>{children}</AppShell>
    </ProtectedClerkProvider>
  );
}
