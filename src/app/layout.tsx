import type { Metadata } from "next";
import { Inter, JetBrains_Mono, Fraunces } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  display: "swap",
});

const fraunces = Fraunces({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "900"],
  style: ["normal", "italic"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "AEGIS-RELIEF · Stochastic Disaster Logistics",
  description:
    "AI-augmented stochastic optimization platform for disaster response pre-positioning and dynamic resource allocation. Two-stage stochastic MIP + CVRPTW + PPO re-optimization policy.",
  keywords: [
    "disaster response",
    "stochastic optimization",
    "vehicle routing",
    "pre-positioning",
    "operations research",
    "AEGIS",
  ],
  authors: [{ name: "AEGIS Global Hackathon 2026" }],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${jetbrainsMono.variable} ${fraunces.variable} antialiased bg-background text-foreground min-h-screen`}
      >
        <div className="relative">{children}</div>
        <Toaster />
      </body>
    </html>
  );
}
