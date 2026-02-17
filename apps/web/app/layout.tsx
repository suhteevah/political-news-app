import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "The Right Wire — Conservative News Aggregator",
    template: "%s — The Right Wire",
  },
  description: "Conservative news aggregator curating 32+ trusted political sources into one clean feed. No ads, no algorithms — just the news that matters.",
  metadataBase: new URL("https://the-right-wire.com"),
  openGraph: {
    type: "website",
    siteName: "The Right Wire",
    title: "The Right Wire — Conservative News Aggregator",
    description: "Conservative news aggregator curating 32+ trusted political sources into one clean feed. No ads, no algorithms — just the news that matters.",
  },
  twitter: {
    card: "summary",
    title: "The Right Wire",
    description: "Conservative news aggregator. No ads, no algorithms — just the news.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        {/* Plausible Analytics — privacy-friendly, no cookies, GDPR compliant */}
        <Script
          defer
          data-domain="the-right-wire.com"
          src="https://plausible.io/js/script.tagged-events.js"
          strategy="afterInteractive"
        />
      </head>
      <body className="bg-gray-950 text-gray-100 min-h-screen antialiased">
        {children}
      </body>
    </html>
  );
}
