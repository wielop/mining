import "./globals.css";
import "@solana/wallet-adapter-react-ui/styles.css";
import "@/lib/initBuffer";
import type { Metadata } from "next";
import { JetBrains_Mono, Space_Grotesk } from "next/font/google";
import { WalletProviders } from "@/components/WalletProviders";
import { ToastProvider } from "@/components/shared/ToastProvider";
import { Providers } from "./providers";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
});

export const metadata: Metadata = {
  title: "Mind Factory — Mining & Staking",
  description: "Mind Factory: pro-rata mining and staking with sustainable rewards.",
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${spaceGrotesk.variable} ${jetbrainsMono.variable} font-sans`}>
        <WalletProviders>
          <Providers>
            <ToastProvider>{children}</ToastProvider>
          </Providers>
        </WalletProviders>
      </body>
    </html>
  );
}
