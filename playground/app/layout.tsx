import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Arc Playground",
  description: "Try Arc programming language in your browser",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
