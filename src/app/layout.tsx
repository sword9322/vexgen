import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: 'VoxPrompt — Voice to AI Prompt',
  description:
    'Record or upload a voice message and transform it into a high-quality, structured AI prompt in seconds.',
  keywords: ['AI prompt', 'voice transcription', 'ChatGPT', 'Claude', 'Whisper', 'prompt engineering'],
  authors: [{ name: 'VoxPrompt' }],
  openGraph: {
    title: 'VoxPrompt — Voice to AI Prompt',
    description: 'Record your voice, get a perfect AI prompt.',
    type: 'website',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#4f46e5',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="min-h-screen bg-gray-50 antialiased font-sans">{children}</body>
    </html>
  );
}
