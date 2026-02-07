import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Inter, JetBrains_Mono } from "next/font/google";

import "./globals.css";
import React from "react";
import { RESUME_DATA } from "@/data/resume-data";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(RESUME_DATA.personalWebsiteUrl),
  title: {
    default: `${RESUME_DATA.name} - ${RESUME_DATA.about}`,
    template: `%s | ${RESUME_DATA.name}`,
  },
  description: RESUME_DATA.summary,
  keywords: [
    "AI Engineer",
    "Generative AI",
    "Agents",
    "Agentic AI",
    "Complaion",
    "Machine Learning",
    "Full Stack Developer",
    "Software Engineer",
    "Lorenzo Germini",
    "Portfolio",
    "Resume",
    "CV",
    ...RESUME_DATA.skills,
  ],
  authors: [
    {
      name: RESUME_DATA.name,
      url: RESUME_DATA.personalWebsiteUrl,
    },
  ],
  creator: RESUME_DATA.name,
  openGraph: {
    type: "website",
    locale: "en_US",
    url: RESUME_DATA.personalWebsiteUrl,
    title: `${RESUME_DATA.name} - ${RESUME_DATA.about}`,
    description: RESUME_DATA.summary,
    siteName: RESUME_DATA.name,
    images: [
      {
        url: RESUME_DATA.avatarUrl,
        width: 1200,
        height: 630,
        alt: RESUME_DATA.name,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: `${RESUME_DATA.name} - ${RESUME_DATA.about}`,
    description: RESUME_DATA.summary,
    creator: "@spleenboi_",
    images: [RESUME_DATA.avatarUrl],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon-16x16.png",
    apple: "/apple-touch-icon.png",
  },
  other: {
    author: RESUME_DATA.name,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${jetbrainsMono.variable}`}
    >
      <head>
        <link rel="preconnect" href="https://avatars.githubusercontent.com" />
        <link
          rel="dns-prefetch"
          href="https://avatars.githubusercontent.com"
        />
      </head>
      <body className="antialiased">
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
