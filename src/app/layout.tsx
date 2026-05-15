import type { Metadata } from "next";
import { Space_Mono, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const spaceMono = Space_Mono({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-space-mono"
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  variable: "--font-jetbrains-mono"
});

export const metadata: Metadata = {
  title: "SECRETCODE",
  description: "Educational multiplayer card game for software engineering and ISO testing concepts."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${spaceMono.variable} ${jetbrainsMono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
