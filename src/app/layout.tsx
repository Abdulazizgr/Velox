import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { getSession } from "@/lib/auth";
import { Navbar } from "@/components/Navbar";
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
  title: "Velox — Skate Rink & POS Management",
  description: "Internal operations, timer tracking, equipment inventory, and POS financial accounting.",
};

async function NavWrapper() {
  const user = await getSession();
  return <Navbar user={user} />;
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
      <body className="min-h-full flex flex-col bg-zinc-950 text-white">
        <Suspense fallback={<div className="h-16 border-b border-zinc-800 bg-zinc-950/80" />}>
          <NavWrapper />
        </Suspense>
        <div className="flex-1">{children}</div>
      </body>
    </html>
  );
}
