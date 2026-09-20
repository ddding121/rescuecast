import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "RescueCast｜智能无障碍应急沟通平台",
  description: "将复杂应急通知转化为多语言、易读、可行动的无障碍信息。",
  other: {
    "codex-preview": "development",
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="antialiased">{children}</body>
    </html>
  );
}
