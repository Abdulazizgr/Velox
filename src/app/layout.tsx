import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { getSession } from "@/lib/auth";
import { AppShell } from "@/components/AppShell";
import { PWARegister } from "@/components/PWARegister";
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
  title: "Velox — Skate POS & Operations",
  description: "Mobile-first POS, live rental timers, equipment asset inventory, and concession management.",
  applicationName: "Velox POS",
  icons: {
    icon: "/logo.jpg",
    apple: "/logo.jpg",
  },
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
  themeColor: "#29221E",
};

async function ShellWrapper({ children }: { children: React.ReactNode }) {
  const user = await getSession();
  return (
    <AppShell user={user}>
      <PWARegister />
      {children}
    </AppShell>
  );
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-[#F7F6F3] text-[#29221E] selection:bg-[#D96827] selection:text-white">
        <Suspense fallback={<div className="min-h-screen bg-[#F7F6F3]" />}>
          <ShellWrapper>{children}</ShellWrapper>
        </Suspense>
      </body>
    </html>
  );
}
