'use client';

import { useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Loader2 } from 'lucide-react';

export default function DashboardPage() {
  const { user, token, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="animate-spin h-8 w-8 text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-2">Bem-vindo, {user?.name || 'Usuário'}!</h1>
      <p className="text-gray-600 mb-6">Gerencie seus lembretes aqui.</p>

      {/* Dashboard content will be built in Fase 2 */}
      <div className="p-8 border rounded-lg text-center text-gray-400">
        <p>Funcionalidades de lembretes em desenvolvimento...</p>
        <p className="text-sm mt-2">Próximas fases: CRUD, WhatsApp, Notificações</p>
      </div>

      <pre className="mt-4 text-xs bg-gray-100 p-2 rounded overflow-auto">
        {token ? `Token: ${token.substring(0, 30)}...` : 'Sem token'}
      </pre>
    </div>
  );
}