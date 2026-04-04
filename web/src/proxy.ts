import { clerkMiddleware } from "@clerk/nextjs/server";
import { NextFetchEvent, NextRequest, NextResponse } from "next/server";

const PROD_PUBLIC_EXACT_PATHS = new Set([
  "/",
  "/favicon.ico",
  "/robots.txt",
  "/sitemap.xml",
  "/sitemap-0.xml",
  "/opengraph-image",
  "/privacy",
]);

const PROD_PUBLIC_PREFIXES = ["/_next", "/blog", "/api/waitlist"];

function isAllowedInProd(pathname: string) {
  if (PROD_PUBLIC_EXACT_PATHS.has(pathname)) return true;
  return PROD_PUBLIC_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(prefix + "/")
  );
}

const devProxy = clerkMiddleware();

export function proxy(request: NextRequest, event: NextFetchEvent) {
  if (process.env.NODE_ENV === "production") {
    const { pathname } = request.nextUrl;
    if (!isAllowedInProd(pathname)) {
      return NextResponse.redirect(new URL("/", request.url));
    }
    return NextResponse.next();
  }

  return devProxy(request, event);
}

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|xml|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
