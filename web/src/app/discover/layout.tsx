import AppShell from "@/components/app/AppShell";
import "./prose.css";

export default function DiscoverLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppShell>{children}</AppShell>;
}
