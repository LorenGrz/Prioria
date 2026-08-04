import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Prioria — Atención blindada para quien no puede mirar el celular',
  description:
    'Prioria filtra tus notificaciones con un agente que aprende tu contexto, lee en voz alta lo crítico y te muestra lo importante en un widget. Portfolio preview.',
  openGraph: {
    title: 'Prioria',
    description: 'Un agente prioriza tus notificaciones para que no pierdas el ritmo.',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <head>
        <link href="https://fonts.googleapis.com" rel="preconnect" />
        <link crossOrigin="" href="https://fonts.gstatic.com" rel="preconnect" />
        <link
          href="https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible+Next:ital,wght@0,400;0,600;0,700;1,400&family=Plus+Jakarta+Sans:wght@400;600;700;800&display=swap"
          rel="stylesheet"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-background font-body text-on-surface antialiased">{children}</body>
    </html>
  );
}
