import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Inventario Médico',
  description: 'Sistema de inventario con AI Vision',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="bg-slate-50 min-h-screen antialiased">
        {children}
      </body>
    </html>
  );
}
