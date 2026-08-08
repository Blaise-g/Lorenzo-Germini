import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Fraunces, Inter, JetBrains_Mono } from "next/font/google";

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

const fraunces = Fraunces({
  subsets: ["latin"],
  axes: ["opsz"],
  style: ["normal", "italic"],
  variable: "--font-fraunces",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(RESUME_DATA.personalWebsiteUrl),
  title: {
    default: RESUME_DATA.metaTitle,
    template: `%s | ${RESUME_DATA.name}`,
  },
  description: RESUME_DATA.metaDescription,
  /* Search strings, not identity surfaces — `CONTEXT.md` enumerates those and
     this is not one of them. "AI Engineer" stays as a recruiter search alias
     alongside the positioning label rather than instead of it (#52, deferred
     item 2). */
  keywords: [
    RESUME_DATA.roleLabel,
    "AI Engineer",
    "Generative AI",
    "Agents",
    "Agentic AI",
    "Complaion",
    "Machine Learning",
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
    title: RESUME_DATA.metaTitle,
    description: RESUME_DATA.metaDescription,
    siteName: RESUME_DATA.name,
  },
  twitter: {
    card: "summary_large_image",
    title: RESUME_DATA.metaTitle,
    description: RESUME_DATA.metaDescription,
    creator: "@spleenboi_",
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
      className={`${inter.variable} ${jetbrainsMono.variable} ${fraunces.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem("theme");if(t==="dark"||(!t&&matchMedia("(prefers-color-scheme:dark)").matches)){document.documentElement.classList.add("dark")}}catch(e){}})()`,
          }}
        />
      </head>
      <body className="antialiased">
        <a
          href="#main-content"
          className="focus:bg-accent focus:text-accent-foreground sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:rounded-md focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:shadow-lg print:hidden"
        >
          Skip to content
        </a>
        {/* `<main>` and the footer come from `RouteFrame`, which each shell
            renders with its own inset — the footer's rule has to end where the
            content above it ends, and only the shell knows where that is. Both
            stay direct children of `<body>`. */}
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
