import React from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { PWAProvider } from './context/PWAContext';
import { LoginView } from './views/LoginView';
import { PublicSurveyView } from './views/PublicSurveyView';
import { AppLayout } from './components/layout/AppLayout';
import { Heart } from 'lucide-react';

const MainApp: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();

  // Check if public satisfaction survey is requested
  const isPublicSurvey =
    window.location.pathname.includes('/pesquisa') ||
    window.location.search.includes('pesquisa=true');

  if (isPublicSurvey) {
    return <PublicSurveyView />;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-stone-900 flex flex-col items-center justify-center p-4">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-rose-600 to-rose-400 flex items-center justify-center text-white shadow-xl animate-pulse mb-3">
          <Heart className="w-8 h-8 fill-white/20" />
        </div>
        <p className="font-serif font-bold text-xl text-stone-100">AFETO</p>
        <p className="text-xs text-stone-400 mt-1">Carregando banco de dados...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginView />;
  }

  return <AppLayout />;
};

export default function App() {
  return (
    <PWAProvider>
      <AuthProvider>
        <MainApp />
      </AuthProvider>
    </PWAProvider>
  );
}
