import React, { useState } from 'react';
import { NavigationRoute } from '../../types';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { BottomNav } from './BottomNav';

import { DashboardView } from '../../views/DashboardView';
import { OrdersView } from '../../views/OrdersView';
import { ProductsView } from '../../views/ProductsView';
import { CustomersView } from '../../views/CustomersView';
import { FinancialView } from '../../views/FinancialView';
import { DeliveriesView } from '../../views/DeliveriesView';
import { ReportsView } from '../../views/ReportsView';
import { SettingsView } from '../../views/SettingsView';

const ROUTE_TITLES: Record<NavigationRoute, string> = {
  dashboard: 'Painel Geral',
  pedidos: 'Gestão de Pedidos',
  produtos: 'Cestas e Produtos',
  clientes: 'Clientes',
  financeiro: 'Caixa e Finanças',
  entregas: 'Agenda de Entregas',
  relatorios: 'Relatórios & Extratos',
  configuracoes: 'Configurações'
};

export const AppLayout: React.FC = () => {
  const [currentRoute, setCurrentRoute] = useState<NavigationRoute>('dashboard');

  const renderCurrentView = () => {
    switch (currentRoute) {
      case 'dashboard':
        return <DashboardView onNavigate={(route) => setCurrentRoute(route)} />;
      case 'pedidos':
        return <OrdersView />;
      case 'produtos':
        return <ProductsView />;
      case 'clientes':
        return <CustomersView />;
      case 'financeiro':
        return <FinancialView />;
      case 'entregas':
        return <DeliveriesView />;
      case 'relatorios':
        return <ReportsView />;
      case 'configuracoes':
        return <SettingsView />;
      default:
        return <DashboardView onNavigate={(route) => setCurrentRoute(route)} />;
    }
  };

  return (
    <div className="min-h-screen bg-rose-50/20 text-stone-800 flex flex-col font-sans">
      {/* Top Header */}
      <Header
        currentRoute={currentRoute}
        routeTitle={ROUTE_TITLES[currentRoute]}
      />

      {/* Main Body Shell with Desktop Sidebar & Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Desktop Sidebar (visible on md:) */}
        <Sidebar
          currentRoute={currentRoute}
          onRouteChange={(route) => setCurrentRoute(route)}
        />

        {/* Dynamic Route Content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 pb-24 md:pb-8 max-w-7xl mx-auto w-full">
          {renderCurrentView()}
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar (visible on mobile) */}
      <BottomNav
        currentRoute={currentRoute}
        onRouteChange={(route) => setCurrentRoute(route)}
      />
    </div>
  );
};
