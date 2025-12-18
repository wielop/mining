import "./globals.css";
import "@solana/wallet-adapter-react-ui/styles.css";
import type { Metadata } from "next";
import { WalletProviders } from "@/components/WalletProviders";
import { ToastProvider } from "@/components/shared/ToastProvider";

export const metadata: Metadata = {
  title: "PoCM Mining",
  description: "PoCM vault mining on X1 testnet",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <WalletProviders>
          <ToastProvider>{children}</ToastProvider>
        </WalletProviders>
      </body>
    </html>
  );
}
