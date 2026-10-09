import type { Metadata } from 'next';
import './globals.css';
import Navbar from '@/components/Navbar';

export const metadata: Metadata = {
  title: 'DocuFlow — Interactive PDF Flipbooks',
  description:
    'Upload a PDF and publish it as a realistic page-flip flipbook. Lead capture, password gates, and per-page analytics included.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#14101f] text-white antialiased">
        <Navbar />
        <main>{children}</main>
        <footer className="border-t border-white/10 py-8 text-center text-sm text-white/40">
          DocuFlow — open-source interactive flipbooks (MIT)
        </footer>
      </body>
    </html>
  );
}
