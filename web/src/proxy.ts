import { clerkMiddleware } from "@clerk/nextjs/server";
import { NextFetchEvent, NextRequest, NextResponse } from "next/server";

// When a Clerk publishable key is configured, the full authenticated app is served
// (auth gating happens client-side in AppShell). Without a key, we fall back to the
// marketing-only lockdown that redirects every non-public path to the landing page.
const CLERK_ENABLED = !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

const PUBLIC_EXACT_PATHS = new Set([
  "/",
  "/favicon.ico",
  "/robots.txt",
  "/sitemap.xml",
  "/sitemap-0.xml",
  "/opengraph-image",
  "/privacy",
]);

const PUBLIC_PREFIXES = ["/_next", "/blog", "/api/waitlist"];

function isPublicPath(pathname: string) {
  if (PUBLIC_EXACT_PATHS.has(pathname)) return true;
  return PUBLIC_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(prefix + "/")
  );
}

const clerkProxy = clerkMiddleware();

export function proxy(request: NextRequest, event: NextFetchEvent) {
  if (CLERK_ENABLED) {
    return clerkProxy(request, event);
  }

  // Marketing-only fallback (no Clerk key configured).
  const { pathname } = request.nextUrl;
  if (!isPublicPath(pathname)) {
    return NextResponse.redirect(new URL("/", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|xml|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
