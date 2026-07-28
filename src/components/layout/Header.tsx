import React from 'react';
import { Heart, Download, LogOut, User as UserIcon } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { usePWA } from '../../context/PWAContext';
import { NavigationRoute } from '../../types';

interface HeaderProps {
  currentRoute: NavigationRoute;
  routeTitle: string;
}

export const Header: React.FC<HeaderProps> = ({ routeTitle }) => {
  const { user, logout } = useAuth();
  const { canInstall, promptInstall } = usePWA();

  return (
    <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-rose-100 px-4 py-3 sm:px-6 flex items-center justify-between shadow-xs">
      {/* Brand & Mobile Title */}
      <div className="flex items-center space-x-3">
        <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-tr from-rose-600 to-rose-400 text-white shadow-xs">
          <Heart className="w-5 h-5 fill-white/20" />
        </div>
        <div>
          <div className="flex items-center space-x-2">
            <span className="font-serif font-bold text-lg text-rose-950 tracking-tight">AFETO</span>
            <span className="text-[10px] font-semibold uppercase tracking-wider bg-rose-100 text-rose-700 px-1.5 py-0.5 rounded-full">
              PWA
            </span>
          </div>
          <p className="text-xs text-stone-500 font-medium hidden sm:block">
            Gestão de Cestas de Café da Manhã
          </p>
        </div>
      </div>

      {/* Current Page Title (Mobile & Tablet) */}
      <div className="hidden md:block text-stone-700 font-semibold text-sm bg-rose-50/50 px-3 py-1 rounded-lg border border-rose-100/80">
        {routeTitle}
      </div>

      {/* Right Action Tools */}
      <div className="flex items-center space-x-2 sm:space-x-3">
        {canInstall && (
          <button
            onClick={promptInstall}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-rose-600 text-white text-xs font-semibold hover:bg-rose-700 transition-colors shadow-xs active:scale-95"
            title="Instalar aplicativo no dispositivo"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Instalar PWA</span>
          </button>
        )}

        {/* User Badge */}
        {user && (
          <div className="flex items-center space-x-2 border-l border-rose-100 pl-3 ml-1">
            <div className="w-8 h-8 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center font-bold text-xs border border-rose-200">
              {user.name.charAt(0)}
            </div>
            <div className="hidden lg:block text-left">
              <p className="text-xs font-bold text-stone-800 leading-tight">{user.name}</p>
              <p className="text-[10px] text-stone-500 capitalize">{user.role}</p>
            </div>
            <button
              onClick={logout}
              className="p-1.5 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
              title="Sair do sistema"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
