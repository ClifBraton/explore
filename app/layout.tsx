import type { Metadata } from "next";
import { ClientProviders } from "@/components/client-providers";
import { RelayerScriptLoader } from "@/components/providers/relayer-script-loader";
import "./globals.css";

export const metadata: Metadata = {
  title: "Explore",
  description: "Discover encrypted content with NFT or Token holdings",
  icons: {
    icon: "/star.svg",
    shortcut: "/star.svg",
    apple: "/star.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="antialiased">
        <RelayerScriptLoader />
        <ClientProviders>{children}</ClientProviders>
      </body>
    </html>
  );
}
