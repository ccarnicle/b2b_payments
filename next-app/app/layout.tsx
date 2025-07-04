// next-app/app/layout.tsx
import type { Metadata } from "next";
// Import your new fonts
import { Lora, Playfair_Display } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Web3Provider } from "@/lib/contexts/Web3Context";
import { Providers } from './providers';

// Configure Lora for body text
const lora = Lora({
  subsets: ["latin"],
  display: 'swap',
  variable: '--font-lora', // CSS variable for Tailwind
});

// Configure Playfair Display for headlines
const playfairDisplay = Playfair_Display({
  subsets: ["latin"],
  display: 'swap',
  weight: ['400', '700'], // The weights you plan to use
  variable: '--font-playfair-display', // CSS variable for Tailwind
});

// Update your site metadata
export const metadata: Metadata = {
  title: "Pact",
  description: "Multi-chain escrow platform for Prize Pool contests and Milestone-based payments. Create transparent, on-chain agreements with automated fund distribution.",
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: '32x32', type: 'image/x-icon' },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon-48x48.png', sizes: '48x48', type: 'image/png' },
    ],
    shortcut: '/favicon.ico',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // Apply the font variables to the <html> tag
    <html lang="en" className={`${lora.variable} ${playfairDisplay.variable}`}>
      <body>
        <Providers>
          <Web3Provider>
            <div className="flex flex-col min-h-screen">
              <Header />
              <main className="flex-grow container mx-auto px-4 py-8">
                {children}
              </main>
              <Footer />
            </div>
          </Web3Provider>
        </Providers>
      </body>
    </html>
  );
}