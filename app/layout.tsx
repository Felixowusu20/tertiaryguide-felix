import type { Metadata, Viewport } from "next";
import { Instrument_Sans } from "next/font/google";
import "./globals.css";
import { Analytics } from "@vercel/analytics/next";
import { VisitTracker } from "./components/VisitTracker";
import NextTopLoader from "nextjs-toploader";
import { getSiteUrl } from "@/lib/site-url";

const siteUrl = getSiteUrl();
const defaultTitle =
  "TertiaryGuide — University forms, programmes & WASSCE checkers in Ghana";
const defaultDescription =
  "Your trusted resource to higher education in Ghana. Find and compare programmes, buy university application forms, get WASSCE checkers, and track deadlines.";

const instrumentSans = Instrument_Sans({
  subsets: ["latin"],
  variable: "--font-instrument-sans",
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: defaultTitle,
    template: "%s | TertiaryGuide",
  },
  description: defaultDescription,
  applicationName: "TertiaryGuide",
  category: "education",
  keywords: [
    "Ghana university forms",
    "WASSCE checker",
    "tertiary education Ghana",
    "university application",
    "programme search",
    "KNUST",
    "UCC",
    "admission",
  ],
  authors: [{ name: "TertiaryGuide", url: siteUrl }],
  creator: "TertiaryGuide",
  openGraph: {
    type: "website",
    locale: "en_GH",
    url: siteUrl,
    siteName: "TertiaryGuide",
    title: defaultTitle,
    description: defaultDescription,
    images: [
      {
        url: "/og-image.jpg",
        width: 1200,
        height: 630,
        type: "image/jpeg",
        alt: "TertiaryGuide — discover convenience: university forms, programmes, and WASSCE checkers",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: defaultTitle,
    description: defaultDescription,
    images: ["/og-image.jpg"],
  },
  alternates: {
    canonical: "/",
  },
  robots: {
    index: true,
    follow: true,
  },
  icons: {
    icon: [
      { url: "/favicon-16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
    ],
    shortcut: "/favicon-32.png",
    apple: "/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#007AFF",
  width: "device-width",
  initialScale: 1,
};

const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "TertiaryGuide",
  url: siteUrl,
  logo: `${siteUrl}/hero/logoTguide.png`,
  sameAs: [
    "https://www.instagram.com/tertiaryguide1",
    "https://www.tiktok.com/@tertiaryguide",
    "https://youtube.com/@tertiaryguide",
  ],
  description: defaultDescription,
  contactPoint: {
    "@type": "ContactPoint",
    contactType: "customer support",
    areaServed: "GH",
    availableLanguage: ["en"],
  },
};

const websiteJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "TertiaryGuide",
  url: siteUrl,
  description: defaultDescription,
  publisher: { "@id": `${siteUrl}#organization` },
  potentialAction: {
    "@type": "SearchAction",
    target: {
      "@type": "EntryPoint",
      urlTemplate: `${siteUrl}/program-search?query={search_term_string}`,
    },
    "query-input": "required name=search_term_string",
  },
};

const organizationWithId = {
  ...organizationJsonLd,
  "@id": `${siteUrl}#organization`,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${instrumentSans.variable} antialiased`}>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify([organizationWithId, websiteJsonLd]),
          }}
        />
        <NextTopLoader
          color="#007AFF"
          showSpinner={false}
          shadow="0 0 10px #007AFF,0 0 5px #007AFF"
        />
        <VisitTracker />
        {children}
        <Analytics />
      </body>
    </html>
  );
}
