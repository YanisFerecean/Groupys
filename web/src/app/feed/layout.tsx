import AppShell from "@/components/app/AppShell";

export default function FeedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppShell>{children}</AppShell>;
}
