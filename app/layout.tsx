import type { Metadata } from "next";
import { Buda } from "next/font/google";
import "./globals.css";

const fontAhmedEmad = Buda({
  weight: "300",
  subsets: ["latin"],
  variable: "--font-ahmed-emad",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Ahmed Emad Photographs | Architectural Photography Portfolio",
  description: "Professional architectural photography showcasing stunning spaces, interiors, and design projects. Cultural, residential, hospitality, and commercial photography.",
  keywords: ["architectural photography", "interior photography", "design photography", "Ahmed Emad"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={fontAhmedEmad.variable}>
      <body>{children}</body>
    </html>
  );
}
