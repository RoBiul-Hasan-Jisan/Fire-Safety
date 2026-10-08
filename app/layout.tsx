import type { ReactNode } from 'react';
import './globals.css';

export const metadata = { title: 'FLAMEFALL — Fire Safety: Moon to Mars' };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
