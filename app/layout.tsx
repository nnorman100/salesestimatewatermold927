import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";

export const metadata: Metadata = {
  title: "Alert Disaster Restoration — Field Scoping Copilot",
  description:
    "Real-time mobile field scoping, California statutory compliance, and deterministic pricing copilot.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "ADR Scoping",
  },
};

export const viewport: Viewport = {
  themeColor: "#dc2626",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/icon.png" />
      </head>
      <body className="min-h-screen bg-slate-50 flex flex-col">
        <ServiceWorkerRegister />
        <main className="flex-1">{children}</main>
      </body>
    </html>
  );
}
