import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "IndiaPostExam.in",
  description: "Your Journey. Our Guidance. Your Success.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}