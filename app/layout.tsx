import "./globals.css";
import type { Metadata, Viewport } from "next";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export const metadata: Metadata = {
  title: "学童クラブ おやつ管理",
  description: "写真判別・発注管理・週別/月別集計に対応したおやつ管理アプリ",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "おやつ管理",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body className="bg-surface text-text-primary font-sans antialiased min-h-dvh">{children}</body>
    </html>
  );
}
