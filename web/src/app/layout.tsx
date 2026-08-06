import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";

const sans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-sans",
  weight: ["400", "500", "600", "700", "800"],
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-mono",
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "QuantumShield — #1 Cybersecurity OS | AI Pentest, Scanner, Identity & Compliance",
  description:
    "Unified cybersecurity platform: QuantumStrike AI autonomous pentesting, Deep Scanner, identity control, AI-attack defense, cloud CSPM, phishing, dark web intel, and SOC 2 / ISO compliance — better than Scanifier, Veiliux, Opal, Adaptive, and Vanta alone.",
  keywords: [
    "autonomous AI penetration testing",
    "deep vulnerability scanner",
    "cybersecurity platform",
    "CSPM",
    "SOC 2 compliance",
    "identity authorization",
    "AI phishing defense",
    "OWASP Top 10",
    "QuantumShield",
  ],
  openGraph: {
    title: "QuantumShield — The cybersecurity operating system",
    description:
      "Autonomous AI pentest + deep scanning + identity + AI defense + cloud + compliance in one console.",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#070B14",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`dark ${sans.variable} ${mono.variable}`}>
      <body className="antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
