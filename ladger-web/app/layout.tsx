import type { Metadata, Viewport } from "next";
import "./globals.css";
import { APP_NAME } from "@/lib/config";

export const metadata: Metadata = {
  title: `${APP_NAME}: plan, track and grow your money (Android app)`,
  description: `${APP_NAME} is a simple expense, income and savings tracker. Plan each month, log what you spend, track loans and goals. Download the Android APK.`,
};

export const viewport: Viewport = { themeColor: "#0E1A17" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body>{children}</body>
    </html>
  );
}
