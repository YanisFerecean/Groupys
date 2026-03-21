import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import UserSync from "@/components/UserSync";
import "./globals.css";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

const BASE_URL = "https://groupys.app";

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    default: "Groupys – Music is better together",
    template: "%s | Groupys",
  },
  description:
    "Groupys is a community-based music platform. Join music communities, match with people who share your taste, rate albums, and share weekly check-ins.",
  keywords: [
    "music community",
    "music social network",
    "album ratings",
    "music discovery",
    "taste match",
    "weekly check-in",
    "music app",
  ],
  authors: [{ name: "Groupys" }],
  creator: "Groupys",
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
    title: "Groupys – Music is better together",
    description:
      "Join music communities, match with people who share your taste, rate albums, and share weekly check-ins.",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "Groupys" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Groupys – Music is better together",
    description:
      "Join music communities, match with people who share your taste, rate albums, and share weekly check-ins.",
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
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      <head>
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
        />
      </head>
      <body className="min-h-full flex flex-col">
        <ClerkProvider>
          <UserSync />
          {children}
        </ClerkProvider>
      </body>
    </html>
  );
}
