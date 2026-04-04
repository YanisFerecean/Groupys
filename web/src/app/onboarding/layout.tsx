import ProtectedClerkProvider from "@/components/auth/ProtectedClerkProvider";

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return <ProtectedClerkProvider>{children}</ProtectedClerkProvider>;
}
