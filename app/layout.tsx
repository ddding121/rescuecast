import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "RescueCast｜智能无障碍应急沟通平台",
  description: "将复杂应急通知转化为多语言、易读、可行动的无障碍信息。",
  authors: [{ name: "Luo Dingrui" }],
  openGraph: {
    title: "RescueCast｜智能无障碍应急沟通平台",
    description: "地图定位、易读通告、现场图片与人工核验的一体化应急沟通工作台。",
    type: "website",
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
