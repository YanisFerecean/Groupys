"use client";

import { useState } from "react";
import Link from "next/link";
import { Show, SignInButton, SignUpButton, UserButton } from "@clerk/nextjs";

const isProd = process.env.NEXT_PUBLIC_APP_ENV === "prod";

export default function NavBar() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <nav className="fixed top-0 w-full z-50 bg-slate-50/70 glass-nav">
      <div className="max-w-7xl mx-auto px-6 sm:px-8 py-5 flex items-center justify-between">
        <div className="text-2xl font-black tracking-tighter text-primary">Groupys</div>

        {/* Desktop nav links */}
        <div className="hidden md:flex justify-center items-center gap-10">
          <a
            className="text-slate-600 font-medium hover:text-red-600 transition-colors duration-300"
            href="#features"
          >
            Features
          </a>
          <a
            className="text-slate-600 font-medium hover:text-red-600 transition-colors duration-300"
            href="#trending"
          >
            Trending
          </a>
        </div>

        {/* Desktop auth + blog */}
        <div className="hidden md:flex justify-end items-center gap-4">
          <Link
            href="/blog"
            className="px-6 py-2 bg-primary text-on-primary rounded-full font-bold scale-95 duration-200 ease-in-out hover:scale-100 transition-transform"
          >
            Blog
          </Link>
          {!isProd && (
            <>
            <Show when="signed-out">
              <SignInButton>
                <button className="px-5 py-2 text-slate-600 font-medium hover:text-slate-900 transition-all">
                  Login
                </button>
              </SignInButton>
              <SignUpButton>
                <button className="px-6 py-2 bg-primary text-on-primary rounded-full font-bold scale-95 duration-200 ease-in-out hover:scale-100 transition-transform">
                  Get Started
                </button>
              </SignUpButton>
            </Show>
            <Show when="signed-in">
              <Link
                href="/profile"
                className="px-6 py-2 bg-primary text-on-primary rounded-full font-bold scale-95 duration-200 ease-in-out hover:scale-100 transition-transform"
              >
                My Profile
              </Link>
              <UserButton />
            </Show>
            </>
          )}
        </div>

        {/* Mobile: auth + hamburger */}
        <div className="flex md:hidden justify-end items-center gap-3">
          {!isProd && (
            <Show when="signed-in">
              <UserButton />
            </Show>
          )}
          <button
            aria-label="Toggle menu"
            className="p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
            onClick={() => setMobileOpen((o) => !o)}
          >
            <span className="material-symbols-outlined text-2xl">
              {mobileOpen ? "close" : "menu"}
            </span>
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-slate-200/60 bg-slate-50/95 glass-nav px-6 py-6 flex flex-col gap-5">
          <a
            className="text-slate-700 font-medium text-lg hover:text-primary transition-colors"
            href="#features"
            onClick={() => setMobileOpen(false)}
          >
            Features
          </a>
          <a
            className="text-slate-700 font-medium text-lg hover:text-primary transition-colors"
            href="#trending"
            onClick={() => setMobileOpen(false)}
          >
            Trending
          </a>
          <div className="pt-2 flex flex-col gap-3 border-t border-slate-200">
            <Link
              href="/blog"
              className="w-full py-3 bg-primary text-on-primary rounded-full font-bold text-center hover:opacity-90 transition-opacity"
              onClick={() => setMobileOpen(false)}
            >
              Blog
            </Link>
          {!isProd && (
            <>
              <Show when="signed-out">
                <SignInButton>
                  <button className="w-full py-3 text-slate-700 font-medium border border-slate-200 rounded-full hover:bg-slate-100 transition-colors">
                    Login
                  </button>
                </SignInButton>
                <SignUpButton>
                  <button className="w-full py-3 bg-primary text-on-primary rounded-full font-bold hover:opacity-90 transition-opacity">
                    Get Started
                  </button>
                </SignUpButton>
              </Show>
              <Show when="signed-in">
                <Link
                  href="/profile"
                  className="w-full py-3 bg-primary text-on-primary rounded-full font-bold text-center hover:opacity-90 transition-opacity"
                  onClick={() => setMobileOpen(false)}
                >
                  My Profile
                </Link>
              </Show>
            </>
          )}
          </div>
        </div>
      )}
    </nav>
  );
}
