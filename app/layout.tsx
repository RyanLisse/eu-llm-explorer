import type { Metadata } from "next";
import "./globals.css";
import { Geist, Syne, IBM_Plex_Mono } from "next/font/google";
import { cn } from "@/lib/utils";

const geist = Geist({ subsets: ["latin"], variable: "--font-sans" });
const syne = Syne({ subsets: ["latin"], variable: "--font-display", weight: ["600", "700", "800"] });
const mono = IBM_Plex_Mono({ subsets: ["latin"], variable: "--font-mono", weight: ["400", "500", "600", "700"] });

export const metadata: Metadata = {
  title: "EU-Sovereign LLM Explorer",
  description:
    "Reliability-aware comparison of EU LLM routes for general AI workloads — provider-selectable, Azure-aware, sovereign-first.",
};

export default function RootLayout({ children }: { readonly children: React.ReactNode }) {
  return (
    <html lang="en" className={cn("font-sans", geist.variable, syne.variable, mono.variable)}>
      <body>{children}</body>
    </html>
  );
}
