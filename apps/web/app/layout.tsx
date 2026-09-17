export const metadata = {
  title: 'LembreMe - Lembretes Inteligentes',
  description: 'Crie e gerencie lembretes com notificações via WhatsApp',
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}