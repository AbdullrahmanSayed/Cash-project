import type { Metadata } from "next";
import { Cairo } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import PwaInstall from "@/components/shared/pwa-install";

const cairo = Cairo({
  subsets: ["arabic", "latin"],
  weight: ["300", "400", "500", "600", "700", "800", "900"],
  variable: "--font-cairo",
  display: "swap",
});

export const metadata: Metadata = {
  title: "المعرض",
  description: "نظام إدارة المعرض - إدارة المبيعات الكاش والعملاء",
  manifest: "/manifest.json",
  icons: {
    icon: [{ url: "/favicon.svg", type: "image/svg+xml" }],
    apple: "/favicon.svg",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "المعرض",
  },
  other: {
    "mobile-web-app-capable": "yes",
    "theme-color": "#F59E0B",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl" className="dark" suppressHydrationWarning>
      <body className={`${cairo.variable} antialiased bg-background text-foreground font-sans`} suppressHydrationWarning>
        {children}
        <Toaster position="top-center" richColors />
        <PwaInstall />
      </body>
    </html>
  );
}
