import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  X,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  AlertOctagon,
  History,
  CheckCircle2,
  AlertCircle,
  PackageCheck
} from 'lucide-react';
import { db } from '../../db';
import { Product, StockMovementType, StockMovement } from '../../types';
import { formatDateTime } from '../../utils/formatters';

interface StockMovementModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
}

export const StockMovementModal: React.FC<StockMovementModalProps> = ({
  isOpen,
  onClose,
  product
}) => {
  const [activeTab, setActiveTab] = useState<'adjust' | 'history'>('adjust');

  // Adjustment Form State
  const [movementType, setMovementType] = useState<StockMovementType>('entrada_manual');
  const [quantity, setQuantity] = useState<string>('1');
  const [reason, setReason] = useState<string>('');
  const [userName, setUserName] = useState<string>('Administrador AFETO');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);

  // Live Query for Stock Movements for this product or all products if product is null
  const movementsList = useLiveQuery(
    async () => {
      const all = await db.stockMovements.reverse().sortBy('createdAt');
      if (product) {
        return all.filter((m) => m.productId === product.id);
      }
      return all;
    },
    [product]
  ) || [];

  if (!isOpen) return null;

  const qtyNum = parseInt(quantity, 10) || 0;

  // Calculate projected new stock
  let projectedStock = product ? product.stockQuantity : 0;
  if (product) {
    if (movementType === 'entrada_manual') {
      projectedStock = product.stockQuantity + qtyNum;
    } else if (movementType === 'ajuste_inventario') {
      projectedStock = qtyNum; // Direct set
    } else {
      projectedStock = Math.max(0, product.stockQuantity - qtyNum);
    }
  }

  const handleInitialSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!product) {
      setErrorMessage('Selecione um produto válido para movimentar estoque.');
      return;
    }

    if (qtyNum <= 0 && movementType !== 'ajuste_inventario') {
      setErrorMessage('A quantidade deve ser maior que zero (0).');
      return;
    }

    if (!reason.trim()) {
      setErrorMessage('A justificativa / motivo do ajuste é obrigatório.');
      return;
    }

    if (
      (movementType === 'saida_manual' ||
        movementType === 'perda_vencimento' ||
        movementType === 'perda_dano') &&
      qtyNum > product.stockQuantity
    ) {
      setErrorMessage(
        `Quantidade a retirar (${qtyNum}) maior do que o estoque disponível (${product.stockQuantity}). Não é permitido estoque negativo.`
      );
      return;
    }

    setShowConfirmation(true);
  };

  const handleConfirmMovement = async () => {
    if (!product || isSubmitting) return;

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const movementId = `stk_${Date.now()}`;
      const newMovement: StockMovement = {
        id: movementId,
        productId: product.id,
        productName: product.name,
        type: movementType,
        quantity: qtyNum,
        reason: reason.trim(),
        userName: userName.trim() || 'Operador',
        createdAt: new Date().toISOString()
      };

      await db.transaction('rw', [db.produtos, db.products, db.stockMovements], async () => {
        // Update product stock in Dexie
        await db.produtos.update(product.id, { stockQuantity: projectedStock });
        await db.products.update(product.id, { stockQuantity: projectedStock });

        // Add movement log
        await db.stockMovements.put(newMovement);
      });

      setIsSubmitting(false);
      setShowConfirmation(false);
      setReason('');
      setQuantity('1');
      setActiveTab('history');
    } catch (err) {
      console.error('Erro ao registrar movimentação de estoque:', err);
      setErrorMessage('Erro ao salvar no banco de dados. Tente novamente.');
      setIsSubmitting(false);
      setShowConfirmation(false);
    }
  };

  const getMovementLabel = (type: StockMovementType) => {
    switch (type) {
      case 'entrada_manual':
        return { label: 'Entrada Manual (+)', color: 'text-emerald-700 bg-emerald-50 border-emerald-200' };
      case 'saida_manual':
        return { label: 'Saída Manual (-)', color: 'text-amber-700 bg-amber-50 border-amber-200' };
      case 'saida_venda':
        return { label: 'Saída por Venda (-)', color: 'text-rose-700 bg-rose-50 border-rose-200' };
      case 'ajuste_inventario':
        return { label: 'Ajuste de Balanço (Set)', color: 'text-stone-800 bg-stone-100 border-stone-200' };
      case 'perda_vencimento':
        return { label: 'Perda p/ Vencimento (-)', color: 'text-rose-800 bg-rose-100 border-rose-300' };
      case 'perda_dano':
        return { label: 'Perda p/ Avaria/Dano (-)', color: 'text-amber-800 bg-amber-100 border-amber-300' };
      default:
        return { label: type, color: 'text-stone-700 bg-stone-50 border-stone-200' };
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-stone-200 my-auto overflow-hidden animate-in fade-in zoom-in duration-200">
        {/* Modal Header */}
        <div className="p-5 border-b border-stone-100 bg-stone-50/80 flex items-center justify-between sticky top-0 z-10">
          <div>
            <div className="flex items-center space-x-2 text-rose-600">
              <PackageCheck className="w-5 h-5" />
              <h2 className="text-base font-bold text-stone-900">
                {product ? `Movimentar Estoque: ${product.name}` : 'Histórico Geral de Estoque'}
              </h2>
            </div>
            {product && (
              <p className="text-xs text-stone-500 mt-0.5">
                Estoque Atual: <strong className="text-stone-900">{product.stockQuantity} {product.unit}</strong> | Código: {product.code}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation Bar */}
        <div className="flex border-b border-stone-200 bg-stone-100/60 px-5 pt-3 gap-2">
          {product && (
            <button
              onClick={() => setActiveTab('adjust')}
              className={`pb-2.5 px-4 font-bold text-xs transition-all border-b-2 flex items-center space-x-1.5 ${
                activeTab === 'adjust'
                  ? 'border-rose-600 text-rose-600'
                  : 'border-transparent text-stone-500 hover:text-stone-800'
              }`}
            >
              <RefreshCw className="w-4 h-4" />
              <span>Novo Ajuste Manual</span>
            </button>
          )}
          <button
            onClick={() => setActiveTab('history')}
            className={`pb-2.5 px-4 font-bold text-xs transition-all border-b-2 flex items-center space-x-1.5 ${
              activeTab === 'history' || !product
                ? 'border-rose-600 text-rose-600'
                : 'border-transparent text-stone-500 hover:text-stone-800'
            }`}
          >
            <History className="w-4 h-4" />
            <span>Histórico de Lançamentos ({movementsList.length})</span>
          </button>
        </div>

        {/* Body Content */}
        <div className="p-6 overflow-y-auto space-y-4 text-xs">
          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl flex items-center space-x-2 font-medium">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
              <span>{errorMessage}</span>
            </div>
          )}

          {activeTab === 'adjust' && product ? (
            <form onSubmit={handleInitialSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Movement Type */}
                <div>
                  <label className="block text-stone-700 font-semibold mb-1">Tipo de Movimentação</label>
                  <select
                    value={movementType}
                    onChange={(e) => setMovementType(e.target.value as StockMovementType)}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl font-semibold text-xs focus:outline-none focus:border-rose-500"
                  >
                    <option value="entrada_manual">Entrada Manual (Compra / Reposição)</option>
                    <option value="saida_manual">Saída Manual (Consumo Interno)</option>
                    <option value="ajuste_inventario">Ajuste de Balanço (Definir Quantidade Total)</option>
                    <option value="perda_vencimento">Perda por Vencimento / Validade</option>
                    <option value="perda_dano">Perda por Avaria / Quebra</option>
                  </select>
                </div>

                {/* Quantity */}
                <div>
                  <label className="block text-stone-700 font-semibold mb-1">
                    {movementType === 'ajuste_inventario' ? 'Nova Quantidade Exata' : 'Quantidade de Itens'}
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-stone-200 rounded-xl font-bold text-xs focus:outline-none focus:border-rose-500"
                  />
                </div>
              </div>

              {/* Reason / Justification */}
              <div>
                <label className="block text-stone-700 font-semibold mb-1">
                  Motivo / Justificativa do Ajuste <span className="text-rose-600">*</span>
                </label>
                <textarea
                  rows={2}
                  required
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Ex: Contagem física de estoque semanal ou nota fiscal #1234"
                  className="w-full px-3 py-2 bg-white border border-stone-200 rounded-xl font-medium text-xs focus:outline-none focus:border-rose-500 resize-none"
                />
              </div>

              {/* Responsável */}
              <div>
                <label className="block text-stone-700 font-semibold mb-1">Operador Responsável</label>
                <input
                  type="text"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-medium focus:outline-none"
                />
              </div>

              {/* Projection Card */}
              <div className="p-3 bg-stone-50 border border-stone-200 rounded-2xl flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold text-stone-400 block">Projeção do Estoque</span>
                  <span className="text-xs text-stone-600">
                    De <strong className="text-stone-900">{product.stockQuantity}</strong> para{' '}
                    <strong className="text-rose-600">{projectedStock}</strong> {product.unit}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-stone-400 font-bold uppercase block">Status Projetado</span>
                  <span className={`text-xs font-bold ${projectedStock <= product.minStock ? 'text-amber-600' : 'text-emerald-600'}`}>
                    {projectedStock <= 0 ? 'Sem Estoque' : projectedStock <= product.minStock ? 'Estoque Baixo' : 'Estoque Ok'}
                  </span>
                </div>
              </div>

              {/* Confirmation Modal overlay inside modal */}
              {showConfirmation ? (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl space-y-3">
                  <div className="flex items-center space-x-2 text-amber-800 font-bold">
                    <AlertOctagon className="w-5 h-5 text-amber-600" />
                    <span>Confirmar Ajuste Manual de Estoque?</span>
                  </div>
                  <p className="text-xs text-amber-900">
                    Você está alterando o estoque do produto <strong>"{product.name}"</strong> para <strong>{projectedStock} {product.unit}</strong>. Esta ação ficará gravada no histórico de auditoria.
                  </p>
                  <div className="flex items-center justify-end space-x-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowConfirmation(false)}
                      className="px-4 py-2 bg-white hover:bg-stone-100 text-stone-700 font-semibold rounded-xl border border-amber-200"
                    >
                      Voltar / Corrigir
                    </button>
                    <button
                      type="button"
                      onClick={handleConfirmMovement}
                      disabled={isSubmitting}
                      className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl shadow-xs"
                    >
                      {isSubmitting ? 'Gravando...' : 'Confirmar e Gravar'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="pt-2 flex justify-end">
                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl shadow-xs flex items-center space-x-1.5"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Revisar e Gravar Ajuste</span>
                  </button>
                </div>
              )}
            </form>
          ) : (
            /* HISTORY TAB */
            <div className="space-y-3">
              {movementsList.length === 0 ? (
                <div className="p-8 text-center text-stone-400 border border-dashed border-stone-200 rounded-2xl">
                  Nenhuma movimentação registrada no histórico até o momento.
                </div>
              ) : (
                <div className="divide-y divide-stone-100 border border-stone-200 rounded-2xl overflow-hidden bg-white">
                  {movementsList.map((m) => {
                    const badge = getMovementLabel(m.type);
                    return (
                      <div key={m.id} className="p-3.5 flex items-start justify-between gap-3 hover:bg-stone-50/50">
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center space-x-2">
                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${badge.color}`}>
                              {badge.label}
                            </span>
                            <span className="font-bold text-stone-900 truncate">
                              {m.productName || 'Produto'}
                            </span>
                          </div>
                          <p className="text-stone-600 font-medium text-[11px] leading-relaxed">
                            "{m.reason}"
                          </p>
                          <p className="text-[10px] text-stone-400">
                            Por: <strong className="text-stone-600">{m.userName || 'Operador'}</strong> • {formatDateTime(m.createdAt)}
                          </p>
                        </div>

                        <div className="text-right shrink-0">
                          <span className="text-sm font-black text-stone-900 block">
                            {m.type === 'entrada_manual' ? `+${m.quantity}` : m.type === 'ajuste_inventario' ? `= ${m.quantity}` : `-${m.quantity}`}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
