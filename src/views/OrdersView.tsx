import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  ShoppingBag,
  Search,
  Plus,
  Filter,
  PackageOpen,
  Calendar,
  FileText,
  User,
  MapPin,
  Clock,
  CheckCircle2,
  Trash2,
  ChevronRight
} from 'lucide-react';
import { db } from '../db';
import { useAuth } from '../context/AuthContext';
import { OrderStatus, Venda, ItemVenda } from '../types';
import { NewSaleModal } from '../components/orders/NewSaleModal';
import { SaleReceiptModal } from '../components/orders/SaleReceiptModal';
import { formatCurrency, formatDate } from '../utils/formatters';

export const OrdersView: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<OrderStatus | 'todos'>('todos');
  const [searchTerm, setSearchTerm] = useState('');

  // Modals
  const [isNewSaleOpen, setIsNewSaleOpen] = useState(false);
  const [receiptVenda, setReceiptVenda] = useState<Venda | null>(null);
  const [orderToDelete, setOrderToDelete] = useState<Venda | null>(null);

  // Dexie Queries
  const vendas = useLiveQuery(() => db.vendas.toArray(), []) || [];
  const itensVenda = useLiveQuery(() => db.itensVenda.toArray(), []) || [];
  const produtos = useLiveQuery(() => db.produtos.toArray(), []) || [];
  const clientes = useLiveQuery(() => db.clientes.toArray(), []) || [];

  const statusTabs: Array<{ id: OrderStatus | 'todos'; label: string }> = [
    { id: 'todos', label: 'Todos os Pedidos' },
    { id: 'pendente', label: 'Pendentes' },
    { id: 'em_producao', label: 'Em Produção' },
    { id: 'pronto', label: 'Prontos' },
    { id: 'saiu_entrega', label: 'Em Entrega' },
    { id: 'entregue', label: 'Entregues' },
  ];

  // Filter Vendas
  const filteredVendas = vendas.filter((venda) => {
    const matchesTab = activeTab === 'todos' || venda.status === activeTab;

    const term = searchTerm.toLowerCase();
    const clientObj = clientes.find((c) => c.id === venda.clientId);
    const clientName = clientObj?.name || venda.recipientName || '';

    const matchesSearch =
      !term ||
      venda.orderNumber.toLowerCase().includes(term) ||
      clientName.toLowerCase().includes(term) ||
      (venda.deliveryAddress && venda.deliveryAddress.toLowerCase().includes(term));

    return matchesTab && matchesSearch;
  });

  const handleUpdateStatus = async (vendaId: string, newStatus: OrderStatus) => {
    await db.vendas.update(vendaId, { status: newStatus });
    await db.orders.update(vendaId, { status: newStatus });
  };

  const handleDeleteVenda = (venda: Venda) => {
    setOrderToDelete(venda);
  };

  const confirmDeleteVenda = async () => {
    if (!orderToDelete) return;
    try {
      await db.vendas.delete(orderToDelete.id);
      await db.orders.delete(orderToDelete.id);
      setOrderToDelete(null);
    } catch (err) {
      console.error('Erro ao remover venda:', err);
    }
  };

  const handleSaleComplete = (newVenda: Venda) => {
    setReceiptVenda(newVenda);
  };

  const receiptItems = receiptVenda
    ? itensVenda.filter((i) => i.vendaId === receiptVenda.id || i.orderId === receiptVenda.id)
    : [];
  const receiptClient = receiptVenda
    ? clientes.find((c) => c.id === receiptVenda.clientId)
    : null;

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-stone-200/80 shadow-xs">
        <div>
          <div className="flex items-center space-x-2 text-rose-600 mb-1">
            <ShoppingBag className="w-5 h-5" />
            <span className="text-xs font-bold uppercase tracking-wider">Módulo Operacional</span>
          </div>
          <h1 className="text-2xl font-bold text-stone-900">Gestão de Pedidos</h1>
          <p className="text-xs text-stone-500 mt-0.5">
            Acompanhe o fluxo de produção, vendas e emissão de comprovantes das cestas.
          </p>
        </div>

        <button
          onClick={() => setIsNewSaleOpen(true)}
          className="inline-flex items-center justify-center space-x-2 px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs transition-all shadow-sm active:scale-95 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Nova Venda / Cesta</span>
        </button>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Status Tabs */}
          <div className="flex items-center space-x-1 bg-stone-100 p-1 rounded-xl w-full sm:w-auto overflow-x-auto">
            {statusTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                  activeTab === tab.id
                    ? 'bg-white text-rose-700 font-bold shadow-xs'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por cliente ou pedido..."
              className="w-full pl-9 pr-4 py-1.5 bg-white border border-stone-200 rounded-xl text-xs focus:outline-none focus:border-rose-500"
            />
          </div>
        </div>
      </div>

      {/* Vendas List Table Container */}
      {filteredVendas.length === 0 ? (
        <div className="bg-white border border-stone-200/80 rounded-2xl shadow-xs overflow-hidden">
          <div className="p-12 text-center flex flex-col items-center justify-center">
            <div className="w-16 h-16 rounded-2xl bg-rose-50 text-rose-500 flex items-center justify-center mb-3">
              <PackageOpen className="w-8 h-8" />
            </div>
            <h3 className="text-base font-bold text-stone-800">Nenhum pedido encontrado</h3>
            <p className="text-xs text-stone-400 max-w-sm mt-1 mb-4">
              Nenhum registro corresponde aos filtros de busca ou ao status selecionado.
            </p>
            <button
              onClick={() => setIsNewSaleOpen(true)}
              className="inline-flex items-center space-x-2 px-4 py-2 bg-stone-900 text-white rounded-xl text-xs font-semibold hover:bg-stone-800 transition-colors"
            >
              <Plus className="w-4 h-4 text-rose-400" />
              <span>Realizar Primeira Venda</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredVendas.map((venda) => {
            const clientObj = clientes.find((c) => c.id === venda.clientId);
            const clientName = clientObj?.name || venda.recipientName || 'Cliente não cadastrado';
            const vItems = itensVenda.filter((i) => i.vendaId === venda.id || i.orderId === venda.id);

            return (
              <div
                key={venda.id}
                className="bg-white rounded-2xl border border-stone-200/80 shadow-xs hover:border-rose-200 transition-all p-5 space-y-4"
              >
                {/* Top Info Bar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stone-100 pb-3 text-xs">
                  <div className="flex items-center space-x-3">
                    <span className="font-mono font-black text-stone-900 text-sm">#{venda.orderNumber}</span>
                    <select
                      value={venda.status}
                      onChange={(e) => handleUpdateStatus(venda.id, e.target.value as OrderStatus)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border ${
                        venda.status === 'entregue'
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          : venda.status === 'cancelado'
                          ? 'bg-rose-50 text-rose-800 border-rose-200'
                          : 'bg-amber-50 text-amber-800 border-amber-200'
                      }`}
                    >
                      <option value="pendente">Pendente</option>
                      <option value="em_producao">Em Produção</option>
                      <option value="pronto">Pronto para Entrega</option>
                      <option value="saiu_entrega">Em Entrega</option>
                      <option value="entregue">Entregue</option>
                      <option value="cancelado">Cancelado</option>
                    </select>
                  </div>

                  <div className="flex items-center space-x-3 text-stone-500">
                    <span className="flex items-center space-x-1">
                      <Calendar className="w-3.5 h-3.5 text-stone-400" />
                      <span>{formatDate(venda.deliveryDate)}</span>
                    </span>
                    <span className="font-black text-stone-900 text-sm">{formatCurrency(venda.totalAmount)}</span>
                  </div>
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                  {/* Customer Info */}
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block">Cliente / Destinatário</span>
                    <p className="font-bold text-stone-800">{clientName}</p>
                    <p className="text-stone-500 text-[11px] flex items-center space-x-1">
                      <MapPin className="w-3 h-3 text-stone-400 shrink-0" />
                      <span className="truncate">{venda.deliveryAddress || 'Retirada'}</span>
                    </p>
                  </div>

                  {/* Payment Info */}
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block">Pagamento</span>
                    <p className="font-semibold text-stone-800 uppercase">{venda.paymentMethod}</p>
                    <p className="text-emerald-700 text-[11px] font-bold">
                      {venda.paymentStatus === 'pago' ? 'PAGO ✅' : 'PENDENTE ⏳'}
                    </p>
                  </div>

                  {/* Basket Summary */}
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block">Resumo dos Itens</span>
                    <p className="text-stone-700 font-medium">
                      {vItems.length > 0
                        ? `${vItems.length} item(ns) registrados`
                        : 'Cesta Especial AFETO'}
                    </p>
                    {venda.cardMessage && (
                      <p className="text-[11px] text-rose-600 italic truncate max-w-xs">
                        "{venda.cardMessage}"
                      </p>
                    )}
                  </div>
                </div>

                {/* Actions Footer */}
                <div className="pt-3 border-t border-stone-100 flex items-center justify-between">
                  <button
                    onClick={() => setReceiptVenda(venda)}
                    className="px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-800 font-bold text-xs rounded-xl flex items-center space-x-1.5 transition-colors"
                  >
                    <FileText className="w-3.5 h-3.5 text-rose-600" />
                    <span>Ver Comprovante</span>
                  </button>

                  {user?.role === 'admin' && (
                    <button
                      onClick={() => handleDeleteVenda(venda)}
                      className="p-1.5 text-stone-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                      title="Remover Venda (Apenas Administrador)"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* New Sale Modal */}
      <NewSaleModal
        isOpen={isNewSaleOpen}
        onClose={() => setIsNewSaleOpen(false)}
        products={produtos}
        clients={clientes}
        onSaleComplete={handleSaleComplete}
      />

      {/* Sale Receipt Modal */}
      <SaleReceiptModal
        isOpen={!!receiptVenda}
        onClose={() => setReceiptVenda(null)}
        venda={receiptVenda}
        items={receiptItems}
        client={receiptClient}
      />

      {/* Order Delete Confirmation Modal */}
      {orderToDelete && (
        <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-stone-200">
            <div className="flex items-center space-x-3 text-rose-600 mb-3">
              <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center text-rose-600">
                <Trash2 className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-stone-900">Remover Pedido #{orderToDelete.orderNumber}</h3>
            </div>

            <p className="text-xs text-stone-600 leading-relaxed mb-4">
              Tem certeza que deseja cancelar/remover esta venda do sistema? Esta ação removerá o registro do pedido.
            </p>

            <div className="flex items-center justify-end space-x-2 pt-3 border-t border-stone-100">
              <button
                type="button"
                onClick={() => setOrderToDelete(null)}
                className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-semibold"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmDeleteVenda}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold shadow-xs"
              >
                Sim, Remover Pedido
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
