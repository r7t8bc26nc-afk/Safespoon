import './globals.css';
import { Poppins } from 'next/font/google';
import BottomNav from './components/BottomNav'; // Import the nav

const poppins = Poppins({ 
  weight: ['400', '700'],
  subsets: ['latin'],
  variable: '--font-poppins',
});

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={`${poppins.variable} font-sans bg-[#F0FDFA] text-[#0F172A]`}>
        {children}
        <BottomNav /> {/* This now lives on every page */}
      </body>
    </html>
  );
}