import React, { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  AlertCircle,
  Calendar,
  PackageX,
  Package,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Plus,
  ShoppingBag,
  Gift,
  Truck,
  Eye,
  RefreshCw,
  BarChart3,
  Layers,
  ShieldAlert,
  CheckCircle2,
  ChevronRight,
  Filter,
  Info
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  AreaChart,
  Area
} from 'recharts';
import { db } from '../db';
import { NavigationRoute, Product, Venda, FluxoDeCaixa } from '../types';

interface DashboardViewProps {
  onNavigate: (route: NavigationRoute) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ onNavigate }) => {
  // Active Alert Filter Tab state
  const [activeAlertTab, setActiveAlertTab] = useState<
    'todos' | 'vazio' | 'baixo' | 'vencidos' | 'proximos'
  >('todos');

  // Chart view mode (Bar vs Area)
  const [chartType, setChartType] = useState<'bar' | 'area'>('bar');

  // Today Date Strings
  const todayDate = new Date();
  const todayStr = todayDate.toISOString().split('T')[0];
  const currentMonthIdx = todayDate.getMonth(); // 0-11
  const currentYear = todayDate.getFullYear();

  const formattedDate = todayDate.toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  // Live Queries from Dexie
  const productsList = useLiveQuery(() => db.produtos.toArray(), []) || [];
  const salesList = useLiveQuery(() => db.vendas.toArray(), []) || [];
  const cashFlowList = useLiveQuery(() => db.fluxoDeCaixa.toArray(), []) || [];

  // Helper date functions
  const isSameDay = (dateStr?: string) => {
    if (!dateStr) return false;
    return dateStr.split('T')[0] === todayStr;
  };

  const getDaysUntilExpiry = (expiryDate?: string): number | null => {
    if (!expiryDate) return null;
    const cleanDate = expiryDate.split('T')[0];
    const exp = new Date(cleanDate + 'T00:00:00');
    const today = new Date(todayStr + 'T00:00:00');
    const diffTime = exp.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 3600 * 24));
  };

  // 1. RECEBIMENTOS DO DIA (Daily Revenues)
  const recebimentosHoje = useMemo(() => {
    // Receipts from Financial Transactions paid today
    const txReceipts = cashFlowList
      .filter(
        (tx) =>
          tx.type === 'receita' &&
          tx.status === 'pago' &&
          ((tx.paymentDate && isSameDay(tx.paymentDate)) ||
            (tx.dueDate && isSameDay(tx.dueDate)) ||
            isSameDay(tx.createdAt))
      )
      .reduce((sum, tx) => sum + (tx.amount || 0), 0);

    // Sales registered/paid today that might not be in fluxodecaixa
    const txVendaIds = new Set(
      cashFlowList.map((tx) => tx.vendaId).filter(Boolean)
    );
    const salesWithoutTx = salesList
      .filter(
        (venda) =>
          venda.paymentStatus === 'pago' &&
          (isSameDay(venda.createdAt) || isSameDay(venda.deliveryDate)) &&
          !txVendaIds.has(venda.id)
      )
      .reduce((sum, v) => sum + (v.totalAmount || 0), 0);

    return txReceipts + salesWithoutTx;
  }, [cashFlowList, salesList, todayStr]);

  // 2. CUSTOS DO DIA & MÊS (Costs / Expenses)
  const custosHoje = useMemo(() => {
    return cashFlowList
      .filter(
        (tx) =>
          tx.type === 'despesa' &&
          tx.status === 'pago' &&
          ((tx.paymentDate && isSameDay(tx.paymentDate)) ||
            (tx.dueDate && isSameDay(tx.dueDate)) ||
            isSameDay(tx.createdAt))
      )
      .reduce((sum, tx) => sum + (tx.amount || 0), 0);
  }, [cashFlowList, todayStr]);

  const custosMes = useMemo(() => {
    return cashFlowList
      .filter((tx) => {
        if (tx.type !== 'despesa' || tx.status !== 'pago') return false;
        const dateStr = tx.paymentDate || tx.dueDate || tx.createdAt;
        if (!dateStr) return false;
        const txDate = new Date(dateStr);
        return (
          txDate.getMonth() === currentMonthIdx &&
          txDate.getFullYear() === currentYear
        );
      })
      .reduce((sum, tx) => sum + (tx.amount || 0), 0);
  }, [cashFlowList, currentMonthIdx, currentYear]);

  // 3. LUCRO DO DIA (Daily Profit)
  const lucroHoje = useMemo(() => {
    return recebimentosHoje - custosHoje;
  }, [recebimentosHoje, custosHoje]);

  const margemLucroHoje = useMemo(() => {
    if (recebimentosHoje <= 0) return 0;
    return (lucroHoje / recebimentosHoje) * 100;
  }, [lucroHoje, recebimentosHoje]);

  // 4. ALERTAS DE ESTOQUE E VALIDADE
  const estoqueVazioList = useMemo(() => {
    return productsList.filter((p) => p.stockQuantity <= 0);
  }, [productsList]);

  const estoqueBaixoList = useMemo(() => {
    return productsList.filter(
      (p) => p.stockQuantity > 0 && p.stockQuantity <= p.minStock
    );
  }, [productsList]);

  const produtosVencidosList = useMemo(() => {
    return productsList.filter((p) => {
      const diff = getDaysUntilExpiry(p.expiryDate);
      return diff !== null && diff < 0;
    });
  }, [productsList]);

  const produtosProximosVencimentoList = useMemo(() => {
    return productsList.filter((p) => {
      const diff = getDaysUntilExpiry(p.expiryDate);
      return diff !== null && diff >= 0 && diff <= 15;
    });
  }, [productsList]);

  // Filtered Alert Products for Table Display
  const alertProductsDisplay = useMemo(() => {
    if (activeAlertTab === 'vazio') return estoqueVazioList;
    if (activeAlertTab === 'baixo') return estoqueBaixoList;
    if (activeAlertTab === 'vencidos') return produtosVencidosList;
    if (activeAlertTab === 'proximos') return produtosProximosVencimentoList;

    // 'todos' combined
    const combined = new Map<string, Product>();
    [
      ...estoqueVazioList,
      ...estoqueBaixoList,
      ...produtosVencidosList,
      ...produtosProximosVencimentoList
    ].forEach((p) => combined.set(p.id, p));
    return Array.from(combined.values());
  }, [
    activeAlertTab,
    estoqueVazioList,
    estoqueBaixoList,
    produtosVencidosList,
    produtosProximosVencimentoList
  ]);

  // 5. GRÁFICO MENSAL (Monthly Financial Chart Data)
  const monthlyChartData = useMemo(() => {
    const monthNames = [
      'Jan',
      'Fev',
      'Mar',
      'Abr',
      'Mai',
      'Jun',
      'Jul',
      'Ago',
      'Set',
      'Out',
      'Nov',
      'Dez'
    ];

    // Initialize months array for the current year
    const data = monthNames.map((name, index) => ({
      month: name,
      monthIndex: index,
      Recebimentos: 0,
      Custos: 0,
      Lucro: 0
    }));

    // Aggregate Cash Flow Transactions
    cashFlowList.forEach((tx) => {
      const dateStr = tx.paymentDate || tx.dueDate || tx.createdAt;
      if (!dateStr) return;
      const txDate = new Date(dateStr);
      if (isNaN(txDate.getTime())) return;

      const mIdx = txDate.getMonth();
      if (mIdx >= 0 && mIdx < 12) {
        if (tx.type === 'receita' && tx.status === 'pago') {
          data[mIdx].Recebimentos += tx.amount || 0;
        } else if (tx.type === 'despesa' && tx.status === 'pago') {
          data[mIdx].Custos += tx.amount || 0;
        }
      }
    });

    // Aggregate Sales where paymentStatus is 'pago'
    const txVendaIds = new Set(
      cashFlowList.map((tx) => tx.vendaId).filter(Boolean)
    );
    salesList.forEach((venda) => {
      if (venda.paymentStatus === 'pago' && !txVendaIds.has(venda.id)) {
        const dateStr = venda.deliveryDate || venda.createdAt;
        if (!dateStr) return;
        const vDate = new Date(dateStr);
        if (isNaN(vDate.getTime())) return;
        const mIdx = vDate.getMonth();
        if (mIdx >= 0 && mIdx < 12) {
          data[mIdx].Recebimentos += venda.totalAmount || 0;
        }
      }
    });

    // Calculate Net Profit for each month
    return data.map((item) => ({
      ...item,
      Lucro: Math.max(0, item.Recebimentos - item.Custos),
      Recebimentos: Number(item.Recebimentos.toFixed(2)),
      Custos: Number(item.Custos.toFixed(2))
    }));
  }, [cashFlowList, salesList]);

  // Total Alert Counts
  const totalAlertsCount =
    estoqueVazioList.length +
    estoqueBaixoList.length +
    produtosVencidosList.length +
    produtosProximosVencimentoList.length;

  return (
    <div className="space-y-6">
      {/* Top Banner Header */}
      <div className="bg-gradient-to-r from-stone-900 via-stone-800 to-rose-950 text-white rounded-3xl p-6 shadow-md relative overflow-hidden border border-stone-800">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-white/5 skew-x-12 pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center space-x-2 bg-rose-500/20 text-rose-300 border border-rose-500/30 px-3 py-1 rounded-full text-xs font-semibold mb-2">
              <Calendar className="w-3.5 h-3.5" />
              <span className="capitalize">{formattedDate}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-stone-100 tracking-tight">
              Dashboard Operacional AFETO
            </h1>
            <p className="text-stone-300 text-xs sm:text-sm max-w-xl mt-1">
              Acompanhamento diário de recebimentos, custos, margem de lucro e alertas críticos de estoque e validade.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onNavigate('financeiro')}
              className="px-4 py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-2xl text-xs font-bold shadow-md transition-all flex items-center space-x-2 active:scale-95"
            >
              <DollarSign className="w-4 h-4" />
              <span>Gerenciar Caixa</span>
            </button>
            <button
              onClick={() => onNavigate('produtos')}
              className="px-4 py-2.5 bg-stone-800 hover:bg-stone-700 text-stone-200 border border-stone-700 rounded-2xl text-xs font-bold transition-all flex items-center space-x-2 active:scale-95"
            >
              <Gift className="w-4 h-4 text-rose-400" />
              <span>Ver Estoque</span>
            </button>
          </div>
        </div>
      </div>

      {/* 4 MAIN KPI CARDS: Recebimentos, Lucro, Custos, Resumo de Alertas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. RECEBIMENTOS DO DIA */}
        <div className="bg-white p-5 rounded-3xl border border-stone-200/80 shadow-xs hover:border-emerald-300 transition-all flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-stone-400">
                Recebimentos do Dia
              </span>
              <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-2xl border border-emerald-100">
                <DollarSign className="w-5 h-5" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-stone-900 mt-1">
              R$ {recebimentosHoje.toFixed(2)}
            </div>
          </div>
          <div className="pt-3 mt-3 border-t border-stone-100 flex items-center justify-between text-xs text-stone-500">
            <span className="flex items-center space-x-1 text-emerald-600 font-semibold">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Entradas Hoje</span>
            </span>
            <span className="text-[11px] text-stone-400">Caixa & Pedidos</span>
          </div>
        </div>

        {/* 2. LUCRO DO DIA */}
        <div className="bg-white p-5 rounded-3xl border border-stone-200/80 shadow-xs hover:border-emerald-300 transition-all flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-stone-400">
                Lucro do Dia
              </span>
              <div className="p-2.5 bg-emerald-100 text-emerald-700 rounded-2xl border border-emerald-200">
                <TrendingUp className="w-5 h-5" />
              </div>
            </div>
            <div className={`text-2xl sm:text-3xl font-black mt-1 ${lucroHoje >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
              R$ {lucroHoje.toFixed(2)}
            </div>
          </div>
          <div className="pt-3 mt-3 border-t border-stone-100 flex items-center justify-between text-xs">
            <span className="text-stone-500 font-medium">Margem Líquida:</span>
            <span className={`font-bold px-2 py-0.5 rounded-lg ${lucroHoje >= 0 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'}`}>
              {margemLucroHoje.toFixed(1)}%
            </span>
          </div>
        </div>

        {/* 3. CUSTOS (DIA E MÊS) */}
        <div className="bg-white p-5 rounded-3xl border border-stone-200/80 shadow-xs hover:border-amber-300 transition-all flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-stone-400">
                Custos (Dia)
              </span>
              <div className="p-2.5 bg-amber-50 text-amber-600 rounded-2xl border border-amber-100">
                <TrendingDown className="w-5 h-5" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-stone-900 mt-1">
              R$ {custosHoje.toFixed(2)}
            </div>
          </div>
          <div className="pt-3 mt-3 border-t border-stone-100 flex items-center justify-between text-xs text-stone-500">
            <span className="text-stone-400">Custos do Mês:</span>
            <span className="font-bold text-stone-800">
              R$ {custosMes.toFixed(2)}
            </span>
          </div>
        </div>

        {/* 4. RESUMO DE ALERTAS DE ESTOQUE E VALIDADE */}
        <div className="bg-white p-5 rounded-3xl border border-stone-200/80 shadow-xs hover:border-rose-300 transition-all flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-stone-400">
                Alertas de Estoque
              </span>
              <div className={`p-2.5 rounded-2xl border ${totalAlertsCount > 0 ? 'bg-rose-50 text-rose-600 border-rose-200' : 'bg-stone-100 text-stone-500 border-stone-200'}`}>
                <ShieldAlert className="w-5 h-5" />
              </div>
            </div>
            <div className={`text-2xl sm:text-3xl font-black mt-1 ${totalAlertsCount > 0 ? 'text-rose-600' : 'text-stone-900'}`}>
              {totalAlertsCount}
            </div>
          </div>
          <div className="pt-3 mt-3 border-t border-stone-100 flex items-center justify-between text-xs text-stone-500">
            <span>Atenção necessária:</span>
            <span className="font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-100">
              {produtosVencidosList.length + estoqueVazioList.length} Críticos
            </span>
          </div>
        </div>
      </div>

      {/* ALERTAS DETALHADOS: Estoque Vazio, Estoque Baixo, Produtos Vencidos, Próximos do Vencimento */}
      <div className="bg-white p-6 rounded-3xl border border-stone-200/80 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-100 pb-4">
          <div>
            <div className="flex items-center space-x-2 text-rose-600 mb-1">
              <AlertTriangle className="w-4 h-4" />
              <span className="text-xs font-bold uppercase tracking-wider">Painel de Alertas em Tempo Real</span>
            </div>
            <h2 className="text-lg font-black text-stone-900 tracking-tight">
              Monitoramento do Catálogo & Estoque
            </h2>
          </div>

          <button
            onClick={() => onNavigate('produtos')}
            className="text-xs font-bold text-rose-600 hover:text-rose-700 flex items-center space-x-1.5 self-start sm:self-center bg-rose-50 px-3 py-1.5 rounded-xl border border-rose-100"
          >
            <span>Ir para Catálogo Completo</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* 4 Alert Filter Tabs */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-2">
          {/* Tab All */}
          <button
            onClick={() => setActiveAlertTab('todos')}
            className={`p-3 rounded-2xl border text-left transition-all flex flex-col justify-between ${
              activeAlertTab === 'todos'
                ? 'bg-stone-900 text-white border-stone-900 shadow-sm'
                : 'bg-stone-50 text-stone-700 border-stone-200/80 hover:bg-stone-100'
            }`}
          >
            <span className="text-[10px] font-bold uppercase tracking-wider opacity-80">Todos os Alertas</span>
            <div className="text-xl font-black mt-1 flex items-center justify-between">
              <span>{totalAlertsCount}</span>
              <Layers className="w-4 h-4 opacity-70" />
            </div>
          </button>

          {/* 1. Estoque Vazio */}
          <button
            onClick={() => setActiveAlertTab('vazio')}
            className={`p-3 rounded-2xl border text-left transition-all flex flex-col justify-between ${
              activeAlertTab === 'vazio'
                ? 'bg-rose-600 text-white border-rose-600 shadow-sm'
                : 'bg-rose-50/50 text-rose-900 border-rose-200/80 hover:bg-rose-100/50'
            }`}
          >
            <span className="text-[10px] font-bold uppercase tracking-wider text-rose-700">Estoque Vazio</span>
            <div className="text-xl font-black mt-1 flex items-center justify-between text-rose-800">
              <span>{estoqueVazioList.length}</span>
              <PackageX className="w-4 h-4 text-rose-600" />
            </div>
          </button>

          {/* 2. Estoque Baixo */}
          <button
            onClick={() => setActiveAlertTab('baixo')}
            className={`p-3 rounded-2xl border text-left transition-all flex flex-col justify-between ${
              activeAlertTab === 'baixo'
                ? 'bg-amber-500 text-white border-amber-500 shadow-sm'
                : 'bg-amber-50/50 text-amber-900 border-amber-200/80 hover:bg-amber-100/50'
            }`}
          >
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700">Estoque Baixo</span>
            <div className="text-xl font-black mt-1 flex items-center justify-between text-amber-800">
              <span>{estoqueBaixoList.length}</span>
              <Package className="w-4 h-4 text-amber-600" />
            </div>
          </button>

          {/* 3. Produtos Vencidos */}
          <button
            onClick={() => setActiveAlertTab('vencidos')}
            className={`p-3 rounded-2xl border text-left transition-all flex flex-col justify-between ${
              activeAlertTab === 'vencidos'
                ? 'bg-red-700 text-white border-red-700 shadow-sm'
                : 'bg-red-50/50 text-red-900 border-red-200/80 hover:bg-red-100/50'
            }`}
          >
            <span className="text-[10px] font-bold uppercase tracking-wider text-red-700">Produtos Vencidos</span>
            <div className="text-xl font-black mt-1 flex items-center justify-between text-red-800">
              <span>{produtosVencidosList.length}</span>
              <AlertCircle className="w-4 h-4 text-red-600" />
            </div>
          </button>

          {/* 4. Próximos do Vencimento */}
          <button
            onClick={() => setActiveAlertTab('proximos')}
            className={`p-3 rounded-2xl border text-left transition-all flex flex-col justify-between col-span-2 lg:col-span-1 ${
              activeAlertTab === 'proximos'
                ? 'bg-orange-500 text-white border-orange-500 shadow-sm'
                : 'bg-orange-50/50 text-orange-900 border-orange-200/80 hover:bg-orange-100/50'
            }`}
          >
            <span className="text-[10px] font-bold uppercase tracking-wider text-orange-700">Próximos a Vencer (&lt;15d)</span>
            <div className="text-xl font-black mt-1 flex items-center justify-between text-orange-800">
              <span>{produtosProximosVencimentoList.length}</span>
              <Clock className="w-4 h-4 text-orange-600" />
            </div>
          </button>
        </div>

        {/* Alerts Table / List Display */}
        {alertProductsDisplay.length === 0 ? (
          <div className="bg-stone-50 border border-stone-200/60 rounded-2xl p-8 text-center flex flex-col items-center justify-center">
            <CheckCircle2 className="w-10 h-10 text-emerald-500 mb-2" />
            <h4 className="text-sm font-bold text-stone-800">Nenhum alerta nesta categoria!</h4>
            <p className="text-xs text-stone-400 mt-1 max-w-sm">
              Todos os produtos selecionados nesta visão estão dentro dos padrões normais de estoque e validade.
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-stone-200/80 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-stone-50 border-b border-stone-100 text-[11px] font-bold uppercase text-stone-400 tracking-wider">
                    <th className="p-3.5">Produto</th>
                    <th className="p-3.5">Código</th>
                    <th className="p-3.5">Estoque Atual</th>
                    <th className="p-3.5">Mínimo Rec.</th>
                    <th className="p-3.5">Validade</th>
                    <th className="p-3.5 text-right">Status do Alerta</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 text-xs text-stone-700">
                  {alertProductsDisplay.slice(0, 8).map((product) => {
                    const daysToExpiry = getDaysUntilExpiry(product.expiryDate);
                    const isVazio = product.stockQuantity <= 0;
                    const isBaixo = product.stockQuantity > 0 && product.stockQuantity <= product.minStock;
                    const isVencido = daysToExpiry !== null && daysToExpiry < 0;
                    const isProximo = daysToExpiry !== null && daysToExpiry >= 0 && daysToExpiry <= 15;

                    return (
                      <tr key={product.id} className="hover:bg-stone-50/60 transition-colors">
                        <td className="p-3.5">
                          <div className="font-bold text-stone-900">{product.name}</div>
                          <div className="text-[10px] text-stone-400">{product.unit}</div>
                        </td>
                        <td className="p-3.5 font-mono text-stone-600 font-medium">
                          {product.code}
                        </td>
                        <td className="p-3.5">
                          <span
                            className={`font-black px-2 py-0.5 rounded-md ${
                              isVazio
                                ? 'bg-rose-100 text-rose-800'
                                : isBaixo
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-stone-100 text-stone-800'
                            }`}
                          >
                            {product.stockQuantity}
                          </span>
                        </td>
                        <td className="p-3.5 text-stone-500 font-medium">
                          {product.minStock}
                        </td>
                        <td className="p-3.5 font-medium">
                          {product.expiryDate ? (
                            <span
                              className={`${
                                isVencido
                                  ? 'text-red-600 font-bold'
                                  : isProximo
                                  ? 'text-orange-600 font-bold'
                                  : 'text-stone-600'
                              }`}
                            >
                              {product.expiryDate}
                              {daysToExpiry !== null && (
                                <span className="text-[10px] block opacity-80">
                                  {isVencido
                                    ? `(${Math.abs(daysToExpiry)}d vencido)`
                                    : `(vence em ${daysToExpiry}d)`}
                                </span>
                              )}
                            </span>
                          ) : (
                            <span className="text-stone-300">-</span>
                          )}
                        </td>
                        <td className="p-3.5 text-right">
                          <div className="flex items-center justify-end gap-1 flex-wrap">
                            {isVazio && (
                              <span className="px-2 py-0.5 bg-rose-100 text-rose-700 text-[10px] font-bold rounded-md border border-rose-200">
                                Esgotado
                              </span>
                            )}
                            {isBaixo && (
                              <span className="px-2 py-0.5 bg-amber-100 text-amber-800 text-[10px] font-bold rounded-md border border-amber-200">
                                Baixo
                              </span>
                            )}
                            {isVencido && (
                              <span className="px-2 py-0.5 bg-red-100 text-red-700 text-[10px] font-bold rounded-md border border-red-200">
                                Vencido
                              </span>
                            )}
                            {isProximo && (
                              <span className="px-2 py-0.5 bg-orange-100 text-orange-800 text-[10px] font-bold rounded-md border border-orange-200">
                                Vence em Breve
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {alertProductsDisplay.length > 8 && (
              <div className="p-3 bg-stone-50 border-t border-stone-100 text-center">
                <button
                  onClick={() => onNavigate('produtos')}
                  className="text-xs font-bold text-rose-600 hover:text-rose-700"
                >
                  Ver mais {alertProductsDisplay.length - 8} produtos com alertas no catálogo →
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* GRÁFICO MENSAL: Recebimentos x Custos x Lucro */}
      <div className="bg-white p-6 rounded-3xl border border-stone-200/80 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-100 pb-4">
          <div>
            <div className="flex items-center space-x-2 text-rose-600 mb-1">
              <BarChart3 className="w-4 h-4" />
              <span className="text-xs font-bold uppercase tracking-wider">Análise Financeira Anual</span>
            </div>
            <h2 className="text-lg font-black text-stone-900 tracking-tight">
              Gráfico Mensal de Desempenho
            </h2>
            <p className="text-xs text-stone-400 mt-0.5">
              Comparativo mês a mês entre Recebimentos (Receita), Custos (Despesas) e Lucro Líquido
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <div className="flex items-center bg-stone-100 p-1 rounded-xl border border-stone-200">
              <button
                onClick={() => setChartType('bar')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  chartType === 'bar'
                    ? 'bg-white text-stone-900 shadow-xs'
                    : 'text-stone-500 hover:text-stone-900'
                }`}
              >
                Barras
              </button>
              <button
                onClick={() => setChartType('area')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  chartType === 'area'
                    ? 'bg-white text-stone-900 shadow-xs'
                    : 'text-stone-500 hover:text-stone-900'
                }`}
              >
                Área
              </button>
            </div>
          </div>
        </div>

        {/* Recharts Monthly Chart */}
        <div className="h-80 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            {chartType === 'bar' ? (
              <BarChart data={monthlyChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E7E5E4" />
                <XAxis dataKey="month" tickLine={false} tick={{ fill: '#78716C', fontSize: 11 }} />
                <YAxis tickLine={false} tick={{ fill: '#78716C', fontSize: 11 }} />
                <Tooltip
                  formatter={(value: number) => [`R$ ${Number(value).toFixed(2)}`, '']}
                  contentStyle={{
                    backgroundColor: '#1C1917',
                    borderColor: '#292524',
                    borderRadius: '16px',
                    color: '#FFF',
                    fontSize: '12px',
                    fontWeight: 'bold'
                  }}
                  itemStyle={{ color: '#F5F5F4' }}
                />
                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                <Bar dataKey="Recebimentos" fill="#10B981" radius={[6, 6, 0, 0]} name="Recebimentos" />
                <Bar dataKey="Custos" fill="#F59E0B" radius={[6, 6, 0, 0]} name="Custos" />
                <Bar dataKey="Lucro" fill="#E11D48" radius={[6, 6, 0, 0]} name="Lucro Líquido" />
              </BarChart>
            ) : (
              <AreaChart data={monthlyChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRec" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorCust" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#F59E0B" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorLucro" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#E11D48" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#E11D48" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E7E5E4" />
                <XAxis dataKey="month" tickLine={false} tick={{ fill: '#78716C', fontSize: 11 }} />
                <YAxis tickLine={false} tick={{ fill: '#78716C', fontSize: 11 }} />
                <Tooltip
                  formatter={(value: number) => [`R$ ${Number(value).toFixed(2)}`, '']}
                  contentStyle={{
                    backgroundColor: '#1C1917',
                    borderColor: '#292524',
                    borderRadius: '16px',
                    color: '#FFF',
                    fontSize: '12px',
                    fontWeight: 'bold'
                  }}
                  itemStyle={{ color: '#F5F5F4' }}
                />
                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                <Area type="monotone" dataKey="Recebimentos" stroke="#10B981" fillOpacity={1} fill="url(#colorRec)" name="Recebimentos" />
                <Area type="monotone" dataKey="Custos" stroke="#F59E0B" fillOpacity={1} fill="url(#colorCust)" name="Custos" />
                <Area type="monotone" dataKey="Lucro" stroke="#E11D48" fillOpacity={1} fill="url(#colorLucro)" name="Lucro Líquido" />
              </AreaChart>
            )}
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
