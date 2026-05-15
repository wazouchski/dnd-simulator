import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "D&D Character Balance Tester",
  description: "A local-first D&D 5e combat simulation workbench."
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
