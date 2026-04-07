import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import UserSync from "@/components/UserSync";
import FontLoader from "@/components/FontLoader";
import { Toaster } from "sonner";
import "./globals.css";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

const BASE_URL = "https://groupys.app";
const CLERK_ENABLED = process.env.NODE_ENV !== "production";

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    default: "Groupys – Find Your Music Community | Connect with Music Lovers",
    template: "%s | Groupys",
  },
  description:
    "Groupys is the music community app where you connect with music lovers, join music fan communities, rate albums with our album rating app, and discover your music social network.",
  keywords: [
    "music community app",
    "connect with music lovers",
    "music fan communities",
    "album rating app",
    "music social network",
    "music discovery",
    "taste match",
    "weekly hot take",
  ],
  applicationName: "Groupys",
  authors: [{ name: "Groupys" }],
  creator: "Groupys",
  category: "music",
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: BASE_URL,
    siteName: "Groupys",
    title: "Groupys – Find Your Music Community | Connect with Music Lovers",
    description:
      "Connect with music lovers, join music fan communities, rate albums, and share weekly hot takes on Groupys.",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "Groupys" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Groupys – Find Your Music Community | Connect with Music Lovers",
    description:
      "Connect with music lovers, join music fan communities, rate albums, and share weekly hot takes on Groupys.",
    images: ["/og-image.png"],
    creator: "@groupysapp",
  },
  alternates: {
    canonical: BASE_URL,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const content = (
    <>
      {CLERK_ENABLED ? <UserSync /> : null}
      <FontLoader />
      {children}
      <Toaster />
    </>
  );

  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        {CLERK_ENABLED ? <ClerkProvider>{content}</ClerkProvider> : content}
      </body>
    </html>
  );
}
