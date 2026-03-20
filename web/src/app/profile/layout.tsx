import AppShell from "@/components/app/AppShell";

export default function ProfileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppShell>{children}</AppShell>;
}
