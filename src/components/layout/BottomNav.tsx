import React, { useState } from 'react';
import {
  LayoutDashboard,
  ShoppingBag,
  Gift,
  Wallet,
  Menu,
  X,
  Users,
  Truck,
  FileText,
  Settings,
  LogOut
} from 'lucide-react';
import { NavigationRoute } from '../../types';
import { useAuth } from '../../context/AuthContext';

interface BottomNavProps {
  currentRoute: NavigationRoute;
  onRouteChange: (route: NavigationRoute) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ currentRoute, onRouteChange }) => {
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const { logout, user } = useAuth();

  const mainTabs: Array<{ id: NavigationRoute; label: string; icon: React.ReactNode }> = [
    { id: 'dashboard', label: 'Inicio', icon: <LayoutDashboard className="w-5 h-5" /> },
    { id: 'pedidos', label: 'Pedidos', icon: <ShoppingBag className="w-5 h-5" /> },
    { id: 'produtos', label: 'Cestas', icon: <Gift className="w-5 h-5" /> },
    { id: 'financeiro', label: 'Caixa', icon: <Wallet className="w-5 h-5" /> },
  ];

  const secondaryTabs: Array<{ id: NavigationRoute; label: string; icon: React.ReactNode }> = [
    { id: 'clientes', label: 'Clientes', icon: <Users className="w-5 h-5" /> },
    { id: 'relatorios', label: 'Relatórios', icon: <FileText className="w-5 h-5" /> },
    { id: 'entregas', label: 'Entregas & Agenda', icon: <Truck className="w-5 h-5" /> },
    { id: 'configuracoes', label: 'Configurações', icon: <Settings className="w-5 h-5" /> },
  ];

  const handleRouteSelect = (route: NavigationRoute) => {
    onRouteChange(route);
    setIsMoreOpen(false);
  };

  return (
    <>
      {/* Secondary Drawer Overlay for Mobile */}
      {isMoreOpen && (
        <div
          className="md:hidden fixed inset-0 bg-stone-900/60 backdrop-blur-xs z-40 transition-opacity"
          onClick={() => setIsMoreOpen(false)}
        />
      )}

      {/* Secondary Drawer Panel */}
      <div
        className={`md:hidden fixed bottom-[65px] left-0 right-0 bg-white border-t border-stone-200 rounded-t-2xl shadow-xl z-50 transition-transform duration-200 ease-out p-4 ${
          isMoreOpen ? 'translate-y-0' : 'translate-y-full pointer-events-none'
        }`}
      >
        <div className="flex items-center justify-between pb-3 border-b border-stone-100 mb-3">
          <div className="flex items-center space-x-2">
            <span className="font-serif font-bold text-stone-900 text-base">AFETO Menu</span>
            <span className="text-[10px] bg-rose-100 text-rose-700 font-semibold px-2 py-0.5 rounded-full">
              {user?.name}
            </span>
          </div>
          <button
            onClick={() => setIsMoreOpen(false)}
            className="p-1.5 text-stone-400 hover:text-stone-700 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="grid grid-cols-3 gap-2 py-1">
          {secondaryTabs.map((tab) => {
            const isActive = currentRoute === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => handleRouteSelect(tab.id)}
                className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all ${
                  isActive
                    ? 'bg-rose-50 border-rose-300 text-rose-700 font-bold'
                    : 'bg-stone-50 border-stone-200/60 text-stone-700 hover:bg-stone-100'
                }`}
              >
                <div className={isActive ? 'text-rose-600' : 'text-stone-500'}>{tab.icon}</div>
                <span className="text-xs mt-1.5 font-medium">{tab.label}</span>
              </button>
            );
          })}
        </div>

        <div className="pt-3 mt-3 border-t border-stone-100">
          <button
            onClick={logout}
            className="w-full flex items-center justify-center space-x-2 py-2.5 rounded-xl bg-rose-50 text-rose-700 font-medium text-xs hover:bg-rose-100 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>Sair do sistema</span>
          </button>
        </div>
      </div>

      {/* Main Bottom Bar (Mobile First) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-stone-200/80 z-40 px-2 py-1.5 flex items-center justify-around shadow-lg">
        {mainTabs.map((tab) => {
          const isActive = currentRoute === tab.id && !isMoreOpen;
          return (
            <button
              key={tab.id}
              onClick={() => handleRouteSelect(tab.id)}
              className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl min-w-[64px] transition-all ${
                isActive
                  ? 'text-rose-600 font-bold'
                  : 'text-stone-400 hover:text-stone-700'
              }`}
            >
              <div className={`p-1 rounded-lg transition-transform ${isActive ? 'scale-110 bg-rose-50' : ''}`}>
                {tab.icon}
              </div>
              <span className="text-[10px] tracking-tight mt-0.5">{tab.label}</span>
            </button>
          );
        })}

        {/* More Menu Trigger */}
        <button
          onClick={() => setIsMoreOpen(!isMoreOpen)}
          className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl min-w-[64px] transition-all ${
            isMoreOpen || secondaryTabs.some((t) => t.id === currentRoute)
              ? 'text-rose-600 font-bold'
              : 'text-stone-400 hover:text-stone-700'
          }`}
        >
          <div className={`p-1 rounded-lg ${isMoreOpen || secondaryTabs.some((t) => t.id === currentRoute) ? 'bg-rose-50' : ''}`}>
            {isMoreOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </div>
          <span className="text-[10px] tracking-tight mt-0.5">Mais</span>
        </button>
      </nav>
    </>
  );
};
