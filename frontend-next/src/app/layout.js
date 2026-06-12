import { Outfit, Inter } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/context/AuthContext';
import Navbar from '@/components/Navbar';
import Toast from '@/components/Toast';

const outfit = Outfit({ subsets: ['latin'], variable: '--font-heading', display: 'swap' });
const inter  = Inter({ subsets: ['latin'], variable: '--font-body', display: 'swap' });

export const metadata = {
  title: 'SkyWays — Fly Smarter, Travel Further',
  description: 'Book flights worldwide with SkyWays. Compare prices, select seats, and travel with confidence. Instant confirmation, boarding passes included.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${outfit.variable} ${inter.variable}`} data-scroll-behavior="smooth">
      <body>
        <AuthProvider>
          <Navbar />
          {children}
          <Toast />
        </AuthProvider>
      </body>
    </html>
  );
}
