import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  title: 'Young Bucks Fantasy Hub',
  description:
    'The official hub for the Young Bucks Fantasy Football League — 2024+ draft class only.',
  icons: { icon: '/favicon.ico' },
  openGraph: {
    title: 'Young Bucks Fantasy Hub',
    description: '2024+ Draft Class Dynasty League',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="min-h-screen flex flex-col bg-zinc-950 text-zinc-50">
        <Navbar />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
