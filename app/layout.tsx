import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "wapicoco calendar",
  description: "家族みんなの予定をひとつに",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body className="bg-gray-50 min-h-screen">{children}</body>
    </html>
  );
}
