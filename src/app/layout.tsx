import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "Xcellerate Projector",
  description:
    "Planning, staffing, capacity and project reporting for consulting teams.",
  icons: {
    apple: "/brand/favicon.png",
    icon: "/brand/favicon.png",
    shortcut: "/brand/favicon.png"
  }
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
