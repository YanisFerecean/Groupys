import AppShell from "@/components/app/AppShell";

export default function DiscoverLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppShell>{children}</AppShell>;
}
