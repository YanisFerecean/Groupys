import AppShell from "@/components/app/AppShell";
import ProtectedClerkProvider from "@/components/auth/ProtectedClerkProvider";

export default function ProfileLayout({
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
