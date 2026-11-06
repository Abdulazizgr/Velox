import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { getSession } from "@/lib/auth";
import { AppShell } from "@/components/AppShell";
import { Suspense } from "react";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Velox — Skate Rink POS & Operations",
  description: "Mobile-first POS, live rental timers, equipment asset inventory, and concession management.",
  applicationName: "Velox POS",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Velox POS",
  },
  formatDetection: {
    telephone: true,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#09090b",
};

async function ShellWrapper({ children }: { children: React.ReactNode }) {
  const user = await getSession();
  return <AppShell user={user}>{children}</AppShell>;
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased dark`}
    >
      <body className="min-h-full flex flex-col bg-zinc-950 text-white selection:bg-emerald-500 selection:text-zinc-950">
        <Suspense fallback={<div className="min-h-screen bg-zinc-950" />}>
          <ShellWrapper>{children}</ShellWrapper>
        </Suspense>
      </body>
    </html>
  );
}
