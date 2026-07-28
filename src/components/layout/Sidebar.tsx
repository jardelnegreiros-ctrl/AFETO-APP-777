import React from 'react';
import {
  LayoutDashboard,
  ShoppingBag,
  Gift,
  Users,
  Wallet,
  Truck,
  Settings,
  FileText,
  Heart,
  LogOut,
  Database
} from 'lucide-react';
import { NavigationRoute } from '../../types';
import { useAuth } from '../../context/AuthContext';

interface SidebarProps {
  currentRoute: NavigationRoute;
  onRouteChange: (route: NavigationRoute) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentRoute, onRouteChange }) => {
  const { user, logout } = useAuth();

  const navItems: Array<{ id: NavigationRoute; label: string; icon: React.ReactNode; badge?: string }> = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-5 h-5" /> },
    { id: 'pedidos', label: 'Pedidos', icon: <ShoppingBag className="w-5 h-5" /> },
    { id: 'produtos', label: 'Cestas & Produtos', icon: <Gift className="w-5 h-5" /> },
    { id: 'clientes', label: 'Clientes', icon: <Users className="w-5 h-5" /> },
    { id: 'financeiro', label: 'Financeiro', icon: <Wallet className="w-5 h-5" /> },
    { id: 'relatorios', label: 'Relatórios', icon: <FileText className="w-5 h-5" /> },
    { id: 'entregas', label: 'Entregas & Agenda', icon: <Truck className="w-5 h-5" /> },
    { id: 'configuracoes', label: 'Configurações', icon: <Settings className="w-5 h-5" /> },
  ];

  return (
    <aside className="hidden md:flex flex-col w-64 bg-stone-900 text-stone-300 border-r border-stone-800 shrink-0 min-h-[calc(100vh-57px)]">
      {/* Brand Heading */}
      <div className="p-5 border-b border-stone-800 flex items-center space-x-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-rose-600 to-rose-400 flex items-center justify-center text-white shadow-md">
          <Heart className="w-6 h-6 fill-white/20" />
        </div>
        <div>
          <h1 className="font-serif font-bold text-xl text-stone-100 tracking-wide">AFETO</h1>
          <p className="text-xs text-rose-300 font-medium">Gestão Operacional</p>
        </div>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        <div className="px-3 pb-2 text-[11px] font-semibold tracking-wider text-stone-400 uppercase">
          Módulos Principais
        </div>
        {navItems.map((item) => {
          const isActive = currentRoute === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onRouteChange(item.id)}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                isActive
                  ? 'bg-rose-600 text-white font-semibold shadow-sm'
                  : 'text-stone-300 hover:bg-stone-800 hover:text-white'
              }`}
            >
              <div className="flex items-center space-x-3">
                <span className={isActive ? 'text-white' : 'text-stone-400'}>{item.icon}</span>
                <span>{item.label}</span>
              </div>
              {item.badge && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Database status & User Card */}
      <div className="p-4 m-3 bg-stone-800/80 rounded-xl border border-stone-700/60 space-y-3">
        <div className="flex items-center space-x-2 text-xs text-emerald-400 font-medium">
          <Database className="w-4 h-4 text-emerald-400" />
          <span>Banco Dexie Persistente</span>
        </div>

        {user && (
          <div className="pt-2 border-t border-stone-700/60 flex items-center justify-between">
            <div className="truncate pr-2">
              <p className="text-xs font-semibold text-stone-200 truncate">{user.name}</p>
              <p className="text-[10px] text-stone-400 truncate">{user.email}</p>
            </div>
            <button
              onClick={logout}
              className="p-1.5 text-stone-400 hover:text-rose-400 rounded-lg hover:bg-stone-700 transition-colors"
              title="Sair"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </aside>
  );
};
