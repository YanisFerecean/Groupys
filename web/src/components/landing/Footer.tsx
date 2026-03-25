const links = [
  { label: "Instagram", href: "/coming-soon" },
  { label: "Twitter", href: "https://x.com/groupysapp" },
  { label: "App Store", href: "/coming-soon" },
  { label: "Google Play", href: "/coming-soon" },
];

const legalLinks = [{ label: "Privacy Policy", href: "/privacy" }];

export default function Footer() {
  return (
    <footer className="w-full py-12 px-6 sm:px-8 bg-slate-100 mt-16 md:mt-20">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6 md:gap-8">
        <div className="text-xl font-black text-primary">Groupys</div>
        <div className="flex gap-8">
          {links.map((link) => (
            <a
              key={link.label}
              className="text-slate-500 text-sm tracking-wide hover:text-slate-900 transition-all opacity-80 hover:opacity-100"
              href={link.href}
            >
              {link.label}
            </a>
          ))}
        </div>
        <div className="flex items-center gap-6">
          {legalLinks.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="text-slate-500 text-sm tracking-wide hover:text-primary transition-colors"
            >
              {link.label}
            </a>
          ))}
          <span className="text-slate-500 text-sm tracking-wide">
            © 2026 Groupys. All rights reserved.
          </span>
        </div>
      </div>
    </footer>
  );
}
