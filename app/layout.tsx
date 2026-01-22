import "./globals.css";
import type { Metadata } from "next";
import { ArcShell } from "@/components/arc/ArcShell";

export const metadata: Metadata = {
  title: "ARC",
  description: "Archive · Relationships · Continuity",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <ArcShell>{children}</ArcShell>
      </body>
    </html>
  );
}