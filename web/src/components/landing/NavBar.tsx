import { Show, SignInButton, SignUpButton, UserButton } from "@clerk/nextjs";

export default function NavBar() {
  return (
    <nav className="fixed top-0 w-full z-50 bg-slate-50/70 glass-nav">
      <div className="max-w-7xl mx-auto px-8 py-6 flex justify-between items-center">
        <div className="text-2xl font-black tracking-tighter text-primary">Groupys</div>
        <div className="hidden md:flex items-center gap-10">
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
        <div className="flex items-center gap-4">
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
            <UserButton />
          </Show>
        </div>
      </div>
    </nav>
  );
}
