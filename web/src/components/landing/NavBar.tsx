"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Show, SignInButton, UserButton } from "@clerk/nextjs";

const isProd = process.env.NEXT_PUBLIC_APP_ENV === "prod";

export default function NavBar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [navigating, setNavigating] = useState(false);
  const router = useRouter();

  const goToProfile = () => {
    setNavigating(true);
    router.push("/profile");
  };

  return (
    <>
    {navigating && (
      <div className="fixed inset-0 z-[200] bg-surface flex items-center justify-center">
        <svg className="animate-spin h-10 w-10 text-primary" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
        </svg>
      </div>
    )}
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
            </Show>
            <Show when="signed-in">
              <button
                onClick={goToProfile}
                className="px-6 py-2 bg-primary text-on-primary rounded-full font-bold scale-95 duration-200 ease-in-out hover:scale-100 transition-transform"
              >
                My Profile
              </button>
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
              </Show>
              <Show when="signed-in">
                <button
                  onClick={() => { setMobileOpen(false); goToProfile(); }}
                  className="w-full py-3 bg-primary text-on-primary rounded-full font-bold text-center hover:opacity-90 transition-opacity"
                >
                  My Profile
                </button>
              </Show>
            </>
          )}
          </div>
        </div>
      )}
    </nav>
    </>
  );
}
