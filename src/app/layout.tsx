// src/app/layout.tsx
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'クリプトジャッジ | Crypto AI',
  description: 'AI Signal Engine for Crypto Trading',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja" className="dark">
      <body className={`${inter.className} min-h-screen bg-black text-white selection:bg-white/30`}>
        {children}
      </body>
    </html>
  );
}
