import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import QuickActionLauncher from "@/components/QuickActionLauncher";
import { LanguageProvider } from "@/i18n/LanguageContext";
import FirstVisitModal from "@/components/FirstVisitModal";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "X-MILE | Every MILE Matters, Every FARMER Matters",
  description:
    "X-MILE connects farmers with trusted buyers through AI-assisted quality insights, smart supply aggregation, and transparent delivery. Every MILE Matters, Every FARMER Matters.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans">
        <LanguageProvider>
          {children}
          <QuickActionLauncher />
          <FirstVisitModal />
        </LanguageProvider>
      </body>
    </html>
  );
}
