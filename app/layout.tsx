import type { Metadata, Viewport } from "next";
import "./globals.css";
import { fontAhmedEmad } from "@/lib/fonts";

const SITE_NAME = "Ahmed Emad Photographs";
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://ahmedemadphotographs.com";
const SITE_DESCRIPTION =
  "Professional architectural photography by Ahmed Emad — showcasing stunning spaces, interiors, and design projects across cultural, residential, hospitality, and commercial sectors.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} | Architectural Photography Portfolio`,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  keywords: [
    "architectural photography",
    "interior photography",
    "design photography",
    "Ahmed Emad",
    "Egypt photographer",
    "commercial photography",
    "hospitality photography",
    "real estate photography",
  ],
  authors: [{ name: "Ahmed Emad" }],
  creator: "Ahmed Emad",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: SITE_URL,
    siteName: SITE_NAME,
    title: `${SITE_NAME} | Architectural Photography`,
    description: SITE_DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  alternates: {
    canonical: SITE_URL,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ProfessionalService",
    name: SITE_NAME,
    description: SITE_DESCRIPTION,
    url: SITE_URL,
    image: `${SITE_URL}/og-image.jpg`,
    priceRange: "$$",
    address: {
      "@type": "PostalAddress",
      addressCountry: "EG",
    },
    sameAs: [
      "https://www.instagram.com/ahmedemadv",
      "https://www.linkedin.com/in/ahmed-emad-39044a258",
      "https://www.facebook.com/AhmedEmad25i",
    ],
  };

  return (
    <html lang="en" className={fontAhmedEmad.variable}>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
