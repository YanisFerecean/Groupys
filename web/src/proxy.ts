import { clerkMiddleware } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

const ALLOWED_PREFIXES = ["/", "/api", "/_next", "/favicon.ico", "/blog", "/coming-soon", "/privacy", "/og-image", "/sitemap.xml", "/sitemap-0.xml", "/robots.txt"];

export const proxy = clerkMiddleware((_, request: NextRequest) => {
  if (process.env.APP_ENV === "prod") {
    const { pathname } = request.nextUrl;
    const allowed = ALLOWED_PREFIXES.some(
      (prefix) => pathname === prefix || pathname.startsWith(prefix + "/")
    );

    if (!allowed) {
      return NextResponse.redirect(new URL("/", request.url));
    }
  }
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|xml|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
