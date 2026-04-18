import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "XC Projector",
  description:
    "Planning, staffing, capacity and project reporting for consulting teams."
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
