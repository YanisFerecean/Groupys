import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Coming Soon",
  robots: { index: false, follow: false },
};

export default function ComingSoonPage() {
  return (
    <div className="min-h-screen bg-surface flex flex-col items-center justify-center px-6 text-center">
      {/* Glow blobs */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-primary/8 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/2 -translate-x-1/2 w-64 h-64 bg-secondary/6 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 space-y-6 max-w-lg">
        {/* Badge */}
        <span className="inline-block bg-primary/10 text-primary px-4 py-2 rounded-full font-bold tracking-widest text-xs uppercase">
          Coming Soon
        </span>

        {/* Heading */}
        <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-on-surface">
          We&apos;re building something good.
        </h1>

        <p className="text-lg text-on-surface-variant leading-relaxed">
          This page isn&apos;t ready yet — but it&apos;s on the way.
          Check back soon or head back home.
        </p>

        {/* Actions */}
        <div className="flex flex-wrap gap-3 justify-center pt-4">
          <Link
            href="/"
            className="px-6 py-3 bg-primary text-on-primary rounded-full font-bold hover:shadow-lg hover:shadow-primary/20 transition-all"
          >
            Back to Home
          </Link>
          <Link
            href="/#cta"
            className="px-6 py-3 bg-surface-container-high text-on-surface rounded-full font-bold hover:bg-surface-container-highest transition-all"
          >
            Join the Waitlist
          </Link>
        </div>
      </div>
    </div>
  );
}
