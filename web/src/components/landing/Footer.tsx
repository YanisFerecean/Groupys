const links = [
  { label: "Instagram", href: "#" },
  { label: "Twitter", href: "#" },
  { label: "App Store", href: "#" },
  { label: "Google Play", href: "#" },
];

export default function Footer() {
  return (
    <footer className="w-full py-12 px-8 bg-slate-100 mt-20">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
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
        <div className="text-slate-500 text-sm tracking-wide">
          © 2024 Groupys. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
