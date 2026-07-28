import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  Plus,
  Search,
  DollarSign,
  ArrowDownRight,
  ArrowUpRight,
  Filter,
  Calendar,
  X,
  Trash2,
  Lock,
  AlertTriangle,
  FileSpreadsheet
} from 'lucide-react';
import { db } from '../db';
import { useAuth } from '../context/AuthContext';
import { FluxoDeCaixa, TransactionType } from '../types';
import { NewTransactionModal } from '../components/financial/NewTransactionModal';
import { formatCurrency, formatDate } from '../utils/formatters';

export const FinancialView: React.FC = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  // Filters State
  const [filterType, setFilterType] = useState<'todos' | 'receita' | 'despesa'>('todos');
  const [filterCategory, setFilterCategory] = useState<string>('todas');
  const [filterPayment, setFilterPayment] = useState<string>('todos');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deleteConfirmTx, setDeleteConfirmTx] = useState<FluxoDeCaixa | null>(null);

  // Live Query from Dexie DB
  const transactions = useLiveQuery(() => db.fluxoDeCaixa.toArray(), []) || [];

  // Get distinct categories for filter
  const categoriesList = Array.from(new Set(transactions.map((t) => t.category))).filter(Boolean);

  // Filtered Transactions
  const filteredTransactions = transactions.filter((tx) => {
    // Type Filter
    if (filterType !== 'todos' && tx.type !== filterType) return false;

    // Category Filter
    if (filterCategory !== 'todas' && tx.category !== filterCategory) return false;

    // Payment Filter
    if (filterPayment !== 'todos' && tx.paymentMethod !== filterPayment) return false;

    // Search Term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const matchesSearch =
        tx.description.toLowerCase().includes(term) ||
        tx.category.toLowerCase().includes(term) ||
        (tx.paymentMethod && tx.paymentMethod.toLowerCase().includes(term));
      if (!matchesSearch) return false;
    }

    // Date Range
    if (startDate && tx.dueDate < startDate) return false;
    if (endDate && tx.dueDate > endDate) return false;

    return true;
  });

  // Calculate Totals
  const totalReceitas = filteredTransactions
    .filter((t) => t.type === 'receita' && t.status === 'pago')
    .reduce((acc, t) => acc + t.amount, 0);

  const totalDespesas = filteredTransactions
    .filter((t) => t.type === 'despesa' && t.status === 'pago')
    .reduce((acc, t) => acc + t.amount, 0);

  const saldoLiquido = totalReceitas - totalDespesas;

  // Delete transaction with safety check for automatic entries
  const handleDeleteTransaction = async () => {
    if (!deleteConfirmTx) return;
    await db.fluxoDeCaixa.delete(deleteConfirmTx.id);
    await db.financialTransactions.delete(deleteConfirmTx.id);
    setDeleteConfirmTx(null);
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-stone-200/80 shadow-xs">
        <div>
          <div className="flex items-center space-x-2 text-rose-600 mb-1">
            <Wallet className="w-5 h-5" />
            <span className="text-xs font-bold uppercase tracking-wider">Módulo de Finanças</span>
          </div>
          <h1 className="text-2xl font-bold text-stone-900">Caixa & Fluxo Financeiro</h1>
          <p className="text-xs text-stone-500 mt-0.5">
            Controle completo de entradas (vendas de cestas) e saídas (compras de insumos e custos fixos).
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs transition-all shadow-sm flex items-center space-x-1.5 active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Novo Lançamento</span>
          </button>
        </div>
      </div>

      {/* Summary Balance Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-stone-200/80 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between text-stone-500 text-xs font-semibold">
            <span>Total Entradas (Receitas)</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <ArrowUpRight className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-black text-emerald-700 mt-2">{formatCurrency(totalReceitas)}</p>
          <p className="text-[10px] text-stone-400 mt-1">Vendas de cestas e serviços</p>
        </div>

        <div className="bg-white border border-stone-200/80 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between text-stone-500 text-xs font-semibold">
            <span>Total Saídas (Despesas)</span>
            <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <ArrowDownRight className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-black text-rose-700 mt-2">
            {isAdmin ? formatCurrency(totalDespesas) : '••••••••'}
          </p>
          <p className="text-[10px] text-stone-400 mt-1">
            {isAdmin ? 'Custos com insumos e despesas' : '🔒 Privado (Apenas Administrador)'}
          </p>
        </div>

        <div className="bg-stone-900 text-white border border-stone-800 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between text-stone-400 text-xs font-semibold">
            <span>Saldo Líquido em Caixa</span>
            <div className="w-8 h-8 rounded-xl bg-white/10 text-rose-400 flex items-center justify-center">
              {isAdmin ? <DollarSign className="w-5 h-5" /> : <Lock className="w-5 h-5 text-amber-400" />}
            </div>
          </div>
          <p className={`text-2xl font-black mt-2 ${saldoLiquido >= 0 ? 'text-white' : 'text-rose-400'}`}>
            {isAdmin ? formatCurrency(saldoLiquido) : '••••••••'}
          </p>
          <p className="text-[10px] text-stone-400 mt-1">
            {isAdmin ? 'Resultado financeiro do período' : '🔒 Restrito a Administradores'}
          </p>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-stone-200/80 shadow-xs space-y-3">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-3">
          {/* Type Toggle Tabs */}
          <div className="flex items-center space-x-1 bg-stone-100 p-1 rounded-xl w-full lg:w-auto">
            <button
              onClick={() => setFilterType('todos')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                filterType === 'todos' ? 'bg-white text-stone-900 font-bold shadow-xs' : 'text-stone-600'
              }`}
            >
              Todos os Lançamentos
            </button>
            <button
              onClick={() => setFilterType('receita')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                filterType === 'receita' ? 'bg-white text-emerald-700 font-bold shadow-xs' : 'text-stone-600'
              }`}
            >
              Apenas Entradas
            </button>
            <button
              onClick={() => setFilterType('despesa')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                filterType === 'despesa' ? 'bg-white text-rose-700 font-bold shadow-xs' : 'text-stone-600'
              }`}
            >
              Apenas Saídas
            </button>
          </div>

          {/* Search Input */}
          <div className="relative w-full lg:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar descrição ou categoria..."
              className="w-full pl-9 pr-4 py-1.5 bg-stone-50 border border-stone-200 rounded-xl text-xs focus:outline-none focus:border-rose-500"
            />
          </div>
        </div>

        {/* Second Row Filters: Date Range, Category, Payment Method */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 pt-2 border-t border-stone-100 text-xs">
          <div>
            <label className="block text-[10px] font-bold uppercase text-stone-400 mb-0.5">Data Inicial</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-stone-50 border border-stone-200 rounded-xl font-medium focus:outline-none focus:border-rose-500"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase text-stone-400 mb-0.5">Data Final</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-stone-50 border border-stone-200 rounded-xl font-medium focus:outline-none focus:border-rose-500"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase text-stone-400 mb-0.5">Categoria</label>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-stone-50 border border-stone-200 rounded-xl font-medium focus:outline-none focus:border-rose-500"
            >
              <option value="todas">Todas as Categorias</option>
              {categoriesList.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase text-stone-400 mb-0.5">Forma Pagamento</label>
            <select
              value={filterPayment}
              onChange={(e) => setFilterPayment(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-stone-50 border border-stone-200 rounded-xl font-medium focus:outline-none focus:border-rose-500"
            >
              <option value="todos">Todas as Formas</option>
              <option value="pix">PIX</option>
              <option value="cartao_credito">Cartão de Crédito</option>
              <option value="cartao_debito">Cartão de Débito</option>
              <option value="dinheiro">Dinheiro</option>
            </select>
          </div>
        </div>
      </div>

      {/* Transactions Table */}
      {filteredTransactions.length === 0 ? (
        <div className="bg-white border border-stone-200/80 rounded-2xl p-12 text-center shadow-xs flex flex-col items-center justify-center">
          <div className="w-16 h-16 rounded-2xl bg-rose-50 text-rose-500 flex items-center justify-center mb-3">
            <Wallet className="w-8 h-8" />
          </div>
          <h3 className="text-base font-bold text-stone-800">Sem lançamentos financeiros</h3>
          <p className="text-xs text-stone-400 max-w-sm mt-1 mb-4">
            Nenhum registro encontrado para os filtros selecionados.
          </p>
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs transition-all shadow-xs"
          >
            Novo Lançamento
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-stone-200/80 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-stone-50/80 border-b border-stone-100 text-[11px] font-bold uppercase text-stone-400 tracking-wider">
                  <th className="p-4">Data</th>
                  <th className="p-4">Tipo</th>
                  <th className="p-4">Descrição</th>
                  <th className="p-4">Categoria</th>
                  <th className="p-4">Forma Pagto.</th>
                  <th className="p-4 text-right">Valor</th>
                  <th className="p-4 text-center">Origem</th>
                  <th className="p-4 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 text-xs text-stone-700 font-medium">
                {filteredTransactions.map((tx) => {
                  const isAuto = !!(tx.vendaId || tx.orderId);

                  return (
                    <tr key={tx.id} className="hover:bg-stone-50/50 transition-colors">
                      <td className="p-4 font-semibold text-stone-800">{formatDate(tx.dueDate)}</td>
                      <td className="p-4">
                        <span
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase ${
                            tx.type === 'receita'
                              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                              : 'bg-rose-50 text-rose-800 border border-rose-200'
                          }`}
                        >
                          {tx.type === 'receita' ? '+ Entrada' : '- Saída'}
                        </span>
                      </td>
                      <td className="p-4 font-bold text-stone-900">{tx.description}</td>
                      <td className="p-4 text-stone-600">{tx.category}</td>
                      <td className="p-4 uppercase text-stone-500 font-semibold">{tx.paymentMethod || 'PIX'}</td>
                      <td className={`p-4 text-right font-black text-sm ${tx.type === 'receita' ? 'text-emerald-700' : 'text-rose-700'}`}>
                        {tx.type === 'receita' ? '+' : '-'}{formatCurrency(tx.amount)}
                      </td>
                      <td className="p-4 text-center">
                        {isAuto ? (
                          <span className="px-2 py-0.5 bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-bold rounded-md inline-flex items-center space-x-1" title="Lançamento Automático via Venda">
                            <Lock className="w-3 h-3" />
                            <span>Venda</span>
                          </span>
                        ) : (
                          <span className="text-[10px] text-stone-400 font-medium">Manual</span>
                        )}
                      </td>
                      <td className="p-4 text-right">
                        <button
                          onClick={() => setDeleteConfirmTx(tx)}
                          className="p-1.5 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          title="Excluir Lançamento"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* New Transaction Modal */}
      <NewTransactionModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />

      {/* Safety Confirmation Dialog for Deleting Financial Entry */}
      {deleteConfirmTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-stone-200 text-center space-y-4">
            <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div>
              <h3 className="text-base font-bold text-stone-900">Excluir Lançamento de Caixa?</h3>
              {(deleteConfirmTx.vendaId || deleteConfirmTx.orderId) ? (
                <div className="mt-2 p-3 bg-amber-50 border border-amber-200 text-amber-900 text-xs rounded-xl text-left space-y-1">
                  <p className="font-bold">⚠️ Atenção: Entrada de Caixa Automática!</p>
                  <p>
                    Este lançamento foi gerado automaticamente por uma venda do sistema. A exclusão afetará o extrato do caixa.
                  </p>
                </div>
              ) : (
                <p className="text-xs text-stone-500 mt-1">
                  Esta ação removerá este lançamento ({formatCurrency(deleteConfirmTx.amount)}) do caixa.
                </p>
              )}
            </div>

            <div className="flex items-center justify-center space-x-2 pt-2">
              <button
                onClick={() => setDeleteConfirmTx(null)}
                className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 font-semibold text-xs rounded-xl"
              >
                Cancelar
              </button>
              <button
                onClick={handleDeleteTransaction}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-xs"
              >
                Confirmar Exclusão
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
