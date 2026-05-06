import type { Metadata } from "next";
import { WalletContextProvider } from "../components/WalletContextProvider";
import "../styles/globals.css";

export const metadata: Metadata = {
  title: "CipherVault | Institutional Prime Brokerage on Solana",
  description:
    "Cross-chain collateral via Ika dWallets. Encrypted order flow via Encrypt FHE. " +
    "Institutional-grade credit facilities on Solana.",
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

// Inline script runs before React hydrates — prevents flash of wrong theme
const themeScript = `
(function(){
  try {
    var t = localStorage.getItem('cv-theme');
    if (t === 'light' || t === 'dark') {
      document.documentElement.setAttribute('data-theme', t);
    } else {
      document.documentElement.setAttribute('data-theme', 'dark');
    }
  } catch(e) {}
})();
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="bg-vault-bg">
      <head>
        {/* Flash-free theme init — must run before any CSS */}
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-vault-bg text-vault-text antialiased">
        <WalletContextProvider>
          {children}
        </WalletContextProvider>
      </body>
    </html>
  );
}
