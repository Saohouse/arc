import "./globals.css";
import type { Metadata, Viewport } from "next";
import { ArcShell } from "@/components/arc/ArcShell";
import { WebVitals } from "./web-vitals";

export const metadata: Metadata = {
  title: "ARC",
  description: "Archive · Relationships · Continuity",
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <WebVitals />
        <ArcShell>{children}</ArcShell>
      </body>
    </html>
  );
}