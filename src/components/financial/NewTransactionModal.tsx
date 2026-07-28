import React, { useState } from 'react';
import { X, Plus, DollarSign, Calendar, Tag, CreditCard, CheckCircle2, AlertCircle } from 'lucide-react';
import { db } from '../../db';
import { FluxoDeCaixa, TransactionType, TransactionStatus } from '../../types';

interface NewTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NewTransactionModal: React.FC<NewTransactionModalProps> = ({ isOpen, onClose }) => {
  const [type, setType] = useState<TransactionType>('receita');
  const [category, setCategory] = useState('Vendas de Cestas');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [status, setStatus] = useState<TransactionStatus>('pago');
  const [dueDate, setDueDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentMethod, setPaymentMethod] = useState('pix');

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const val = parseFloat(amount);
    if (isNaN(val) || val <= 0) {
      setErrorMessage('Informe um valor válido e positivo para o lançamento.');
      return;
    }

    if (!description.trim()) {
      setErrorMessage('Informe a descrição do lançamento.');
      return;
    }

    setIsSubmitting(true);

    try {
      const newTransaction: FluxoDeCaixa = {
        id: `flx_${Date.now()}`,
        type,
        category: category.trim() || (type === 'receita' ? 'Outras Receitas' : 'Custos Gerais'),
        description: description.trim(),
        amount: val,
        status,
        dueDate,
        paymentDate: status === 'pago' ? dueDate : undefined,
        paymentMethod,
        createdAt: new Date().toISOString()
      };

      await db.fluxoDeCaixa.put(newTransaction);
      await db.financialTransactions.put(newTransaction);

      setIsSubmitting(false);
      onClose();
    } catch (err) {
      console.error('Erro ao registrar lançamento no caixa:', err);
      setErrorMessage('Erro ao salvar no banco de dados. Tente novamente.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-stone-200 my-auto animate-in fade-in zoom-in duration-200">
        <div className="flex items-center justify-between pb-4 border-b border-stone-100 mb-4">
          <div className="flex items-center space-x-2 text-rose-600">
            <DollarSign className="w-5 h-5 text-emerald-600" />
            <h3 className="text-sm font-bold text-stone-900">Novo Lançamento Financeiro</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl flex items-center space-x-2 font-medium">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Type Toggle */}
          <div>
            <label className="block text-stone-700 font-semibold mb-1">Tipo de Operação</label>
            <div className="grid grid-cols-2 gap-2 p-1 bg-stone-100 rounded-xl">
              <button
                type="button"
                onClick={() => {
                  setType('receita');
                  setCategory('Vendas de Cestas');
                }}
                className={`py-2 rounded-lg font-bold transition-all ${
                  type === 'receita'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                + Receita (Entrada)
              </button>
              <button
                type="button"
                onClick={() => {
                  setType('despesa');
                  setCategory('Compra de Insumos');
                }}
                className={`py-2 rounded-lg font-bold transition-all ${
                  type === 'despesa'
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                - Despesa (Saída)
              </button>
            </div>
          </div>

          {/* Description & Amount */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-stone-700 font-semibold mb-1">Descrição do Lançamento *</label>
              <input
                type="text"
                required
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={type === 'receita' ? 'Ex: Venda de cesta em dinheiro' : 'Ex: Compra de frutas na feira'}
                className="w-full px-3 py-2 bg-white border border-stone-200 rounded-xl font-medium focus:outline-none focus:border-rose-500"
              />
            </div>

            <div>
              <label className="block text-stone-700 font-semibold mb-1">Valor (R$) *</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className={`w-full px-3 py-2 bg-white border border-stone-200 rounded-xl font-black text-sm focus:outline-none ${
                  type === 'receita' ? 'text-emerald-700 focus:border-emerald-500' : 'text-rose-700 focus:border-rose-500'
                }`}
              />
            </div>

            <div>
              <label className="block text-stone-700 font-semibold mb-1">Categoria</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-stone-200 rounded-xl font-medium focus:outline-none focus:border-rose-500"
              >
                {type === 'receita' ? (
                  <>
                    <option value="Vendas de Cestas">Vendas de Cestas</option>
                    <option value="Serviços de Entrega">Serviços de Entrega</option>
                    <option value="Outras Receitas">Outras Receitas</option>
                  </>
                ) : (
                  <>
                    <option value="Compra de Insumos">Compra de Insumos (Alimentos)</option>
                    <option value="Embalagens & Cestaria">Embalagens & Cestaria</option>
                    <option value="Custos Fixos (Água/Luz/Net)">Custos Fixos (Água/Luz/Net)</option>
                    <option value="Manutenção & Equipamentos">Manutenção & Equipamentos</option>
                    <option value="Outras Despesas">Outras Despesas</option>
                  </>
                )}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-stone-700 font-semibold mb-1">Data Lançamento</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-stone-200 rounded-xl font-medium focus:outline-none focus:border-rose-500"
              />
            </div>

            <div>
              <label className="block text-stone-700 font-semibold mb-1">Forma de Pagamento</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-stone-200 rounded-xl font-medium focus:outline-none focus:border-rose-500"
              >
                <option value="pix">PIX</option>
                <option value="cartao_credito">Cartão de Crédito</option>
                <option value="cartao_debito">Cartão de Débito</option>
                <option value="dinheiro">Dinheiro</option>
                <option value="faturado">Faturado</option>
              </select>
            </div>

            <div>
              <label className="block text-stone-700 font-semibold mb-1">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as TransactionStatus)}
                className="w-full px-3 py-2 bg-white border border-stone-200 rounded-xl font-bold focus:outline-none focus:border-rose-500"
              >
                <option value="pago">Confirmado / Pago</option>
                <option value="pendente">Pendente / Agendado</option>
              </select>
            </div>
          </div>

          {/* Submit */}
          <div className="pt-3 border-t border-stone-100 flex items-center justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl font-semibold"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className={`px-5 py-2 text-white rounded-xl font-bold shadow-xs flex items-center space-x-1 ${
                type === 'receita' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isSubmitting ? 'Salvando...' : 'Salvar Lançamento'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
