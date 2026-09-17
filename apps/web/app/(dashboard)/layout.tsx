import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { handler as authOptions } from '@/app/api/auth/[...nextauth]/route';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/(auth)/login');
  }

  return (
    <main>
      <nav>
        <a href="/(dashboard)">Lembretes</a>
        <a href="/(dashboard)/categories">Categorias</a>
        <a href="/(dashboard)/settings">Configurações</a>
      </nav>
      {children}
    </main>
  );
}