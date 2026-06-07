import { ClerkProvider } from "@clerk/nextjs";

// True when the root layout already mounts ClerkProvider (i.e. a publishable key is set).
// Mirrors the gate in app/layout.tsx so we never double-mount the provider.
const ROOT_CLERK_ENABLED = !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

export default function ProtectedClerkProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  if (ROOT_CLERK_ENABLED) return children;
  return <ClerkProvider>{children}</ClerkProvider>;
}
