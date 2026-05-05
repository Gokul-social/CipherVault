import type { Metadata } from "next";
import { WalletContextProvider } from "../components/WalletContextProvider";

export const metadata: Metadata = {
  title: "CipherVault | Confidential Institutional Prime Brokerage",
  description:
    "Trade on a fully encrypted order book with cross-chain collateral. " +
    "Powered by Ika dWallets and Encrypt FHE on Solana.",
  keywords: [
    "CipherVault",
    "prime brokerage",
    "FHE",
    "encrypted order book",
    "Solana",
    "Ika",
    "dWallet",
    "institutional DeFi",
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body
        style={{
          margin: 0,
          fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
          backgroundColor: "#0a0a0f",
          color: "#e4e4e7",
          minHeight: "100vh",
        }}
      >
        <WalletContextProvider>
          {children}
        </WalletContextProvider>
      </body>
    </html>
  );
}
