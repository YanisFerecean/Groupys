import { ClerkProvider } from "@clerk/nextjs";

const ROOT_CLERK_ENABLED = process.env.NODE_ENV !== "production";

export default function ProtectedClerkProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  if (ROOT_CLERK_ENABLED) return children;
  return <ClerkProvider>{children}</ClerkProvider>;
}
