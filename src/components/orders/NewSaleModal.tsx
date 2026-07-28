import React, { useState } from 'react';
import {
  X,
  Plus,
  Trash2,
  ShoppingCart,
  DollarSign,
  User,
  MapPin,
  Calendar,
  CreditCard,
  AlertCircle,
  Package,
  Search,
  CheckCircle2,
  Sparkles,
  Barcode
} from 'lucide-react';
import { db } from '../../db';
import { Product, Client, Venda, ItemVenda, FluxoDeCaixa, OrderStatus, PaymentStatus, PaymentMethod, DeliveryPeriod } from '../../types';
import { formatCurrency } from '../../utils/formatters';

interface BasketItemForm {
  product: Product;
  quantity: number;
  unitPrice: number;
}

interface NewSaleModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  clients: Client[];
  onSaleComplete: (venda: Venda, items: ItemVenda[]) => void;
}

export const NewSaleModal: React.FC<NewSaleModalProps> = ({
  isOpen,
  onClose,
  products,
  clients,
  onSaleComplete
}) => {
  // State for Basket Items
  const [basketItems, setBasketItems] = useState<BasketItemForm[]>([]);
  const [productSearch, setProductSearch] = useState('');
  const [selectedProductId, setSelectedProductId] = useState('');
  const [addQty, setAddQty] = useState<string>('1');

  // Customer & Delivery Info
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [unregisteredClientName, setUnregisteredClientName] = useState('');
  const [deliveryDate, setDeliveryDate] = useState(new Date().toISOString().split('T')[0]);
  const [deliveryPeriod, setDeliveryPeriod] = useState<DeliveryPeriod>('manha_padrao');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [cardMessage, setCardMessage] = useState('');
  const [notes, setNotes] = useState('');

  // Financial Info
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('pix');
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('pago');
  const [receivedAmount, setReceivedAmount] = useState<string>('');
  const [deliveryFee, setDeliveryFee] = useState<string>('0.00');
  const [discount, setDiscount] = useState<string>('0.00');

  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showConfirmationStep, setShowConfirmationStep] = useState(false);

  if (!isOpen) return null;

  // Real-time calculations for Basket
  const totalSalePrice = basketItems.reduce((acc, item) => acc + item.quantity * item.unitPrice, 0);
  const totalCostPrice = basketItems.reduce((acc, item) => acc + item.quantity * item.product.costPrice, 0);
  const feeVal = parseFloat(deliveryFee) || 0;
  const discountVal = parseFloat(discount) || 0;
  const grandTotal = Math.max(0, totalSalePrice + feeVal - discountVal);
  const profitAmount = totalSalePrice - totalCostPrice;
  const marginPercent = totalCostPrice > 0 ? ((profitAmount / totalCostPrice) * 100).toFixed(1) : '0';

  const recVal = parseFloat(receivedAmount) || (paymentMethod === 'dinheiro' ? 0 : grandTotal);
  const changeVal = paymentMethod === 'dinheiro' && recVal > grandTotal ? recVal - grandTotal : 0;

  // Add Item to Basket
  const handleAddItem = () => {
    setErrorMessage(null);
    if (!selectedProductId) {
      setErrorMessage('Selecione um produto para adicionar à cesta.');
      return;
    }

    const prod = products.find((p) => p.id === selectedProductId);
    if (!prod) return;

    const qty = parseInt(addQty, 10);
    if (isNaN(qty) || qty <= 0) {
      setErrorMessage('A quantidade deve ser maior que zero (0).');
      return;
    }

    // Check existing quantity in basket
    const existingInBasket = basketItems.find((bi) => bi.product.id === prod.id);
    const currentBasketQty = existingInBasket ? existingInBasket.quantity : 0;
    const totalRequestedQty = currentBasketQty + qty;

    if (totalRequestedQty > prod.stockQuantity) {
      setErrorMessage(
        `Estoque insuficiente para "${prod.name}". Disponível: ${prod.stockQuantity} un (já adicionado: ${currentBasketQty} un).`
      );
      return;
    }

    if (existingInBasket) {
      setBasketItems(
        basketItems.map((bi) =>
          bi.product.id === prod.id ? { ...bi, quantity: totalRequestedQty } : bi
        )
      );
    } else {
      setBasketItems([
        ...basketItems,
        {
          product: prod,
          quantity: qty,
          unitPrice: prod.salePrice
        }
      ]);
    }

    // Reset selection inputs
    setSelectedProductId('');
    setAddQty('1');
  };

  // Update Item Quantity in Basket
  const handleUpdateItemQty = (productId: string, newQty: number) => {
    setErrorMessage(null);
    const item = basketItems.find((bi) => bi.product.id === productId);
    if (!item) return;

    if (newQty <= 0) {
      handleRemoveItem(productId);
      return;
    }

    if (newQty > item.product.stockQuantity) {
      setErrorMessage(
        `Quantidade maior do que o estoque disponível (${item.product.stockQuantity} un) para "${item.product.name}".`
      );
      return;
    }

    setBasketItems(
      basketItems.map((bi) => (bi.product.id === productId ? { ...bi, quantity: newQty } : bi))
    );
  };

  // Remove Item
  const handleRemoveItem = (productId: string) => {
    setBasketItems(basketItems.filter((bi) => bi.product.id !== productId));
  };

  // Synchronize client details when client is selected
  const handleClientChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const cId = e.target.value;
    setSelectedClientId(cId);
    const selected = clients.find((c) => c.id === cId);
    if (selected) {
      setDeliveryAddress(selected.address || '');
      setRecipientName(selected.name || '');
      setUnregisteredClientName('');
    }
  };

  // SUBMIT SALE (Atomic Dexie Transaction)
  const handleSubmitSale = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return; // Prevent duplicate click submission

    setErrorMessage(null);

    if (basketItems.length === 0) {
      setErrorMessage('Não é permitido finalizar uma cesta de compras vazia.');
      return;
    }

    // Payment rule validation:
    if (paymentMethod === 'dinheiro' && paymentStatus === 'pago') {
      if (recVal < grandTotal) {
        setErrorMessage(`O valor recebido (${formatCurrency(recVal)}) não pode ser menor que o total da venda (${formatCurrency(grandTotal)}) em pagamentos à vista em dinheiro. Altere o status para 'Pendente' ou 'Parcial' se for fiado.`);
        return;
      }
    }

    // Determine Client
    let finalClientId = selectedClientId;
    let finalClientName = unregisteredClientName.trim();
    if (selectedClientId) {
      const foundClient = clients.find((c) => c.id === selectedClientId);
      if (foundClient) finalClientName = foundClient.name;
    }

    if (!finalClientName && !finalClientId) {
      finalClientName = 'Cliente Não Identificado';
    }

    setIsSubmitting(true);

    try {
      const vendaId = `ven_${Date.now()}`;
      const orderNumber = `VEN-2026-${Math.floor(100 + Math.random() * 900)}`;

      const newVenda: Venda = {
        id: vendaId,
        orderNumber,
        clientId: finalClientId || 'cli_anonymous',
        status: 'entregue',
        deliveryDate,
        deliveryPeriod,
        deliveryAddress: deliveryAddress.trim() || 'Balcão / Retirada',
        recipientName: recipientName.trim() || finalClientName,
        recipientPhone: '',
        cardMessage: cardMessage.trim() || undefined,
        paymentStatus,
        paymentMethod,
        receivedAmount: paymentMethod === 'dinheiro' ? recVal : grandTotal,
        changeAmount: changeVal,
        subtotal: totalSalePrice,
        deliveryFee: feeVal,
        discount: discountVal,
        totalAmount: grandTotal,
        notes: notes.trim() || undefined,
        createdAt: new Date().toISOString()
      };

      const newItemsVenda: ItemVenda[] = basketItems.map((bi) => ({
        id: `itv_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        vendaId,
        orderId: vendaId,
        productId: bi.product.id,
        quantity: bi.quantity,
        unitPrice: bi.unitPrice,
        totalPrice: bi.quantity * bi.unitPrice
      }));

      const newStockMovements = basketItems.map((bi) => ({
        id: `stk_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        productId: bi.product.id,
        productName: bi.product.name,
        type: 'saida_venda' as const,
        quantity: bi.quantity,
        reason: `Venda #${orderNumber}`,
        userName: 'Administrador AFETO',
        createdAt: new Date().toISOString()
      }));

      // Atomic Transaction using Dexie DB
      await db.transaction(
        'rw',
        [db.vendas, db.orders, db.itensVenda, db.orderItems, db.produtos, db.products, db.fluxoDeCaixa, db.financialTransactions, db.stockMovements],
        async () => {
          // 1. Save Venda
          await db.vendas.put(newVenda);
          await db.orders.put(newVenda);

          // 2. Save ItemVenda
          await db.itensVenda.bulkPut(newItemsVenda);
          await db.orderItems.bulkPut(newItemsVenda);

          // 3. Deduct product stock
          for (const bi of basketItems) {
            const currentProd = await db.produtos.get(bi.product.id);
            if (currentProd) {
              const updatedStock = Math.max(0, currentProd.stockQuantity - bi.quantity);
              await db.produtos.update(bi.product.id, { stockQuantity: updatedStock });
              await db.products.update(bi.product.id, { stockQuantity: updatedStock });
            }
          }

          // 4. Save stock movements
          await db.stockMovements.bulkPut(newStockMovements);

          // 5. Automatic Cash Flow Entry (Fluxo de Caixa)
          if (paymentStatus === 'pago') {
            const fluxoEntry: FluxoDeCaixa = {
              id: `flx_${Date.now()}`,
              type: 'receita',
              category: 'Vendas de Cestas',
              description: `Venda #${orderNumber} - ${finalClientName}`,
              amount: grandTotal,
              status: 'pago',
              dueDate: deliveryDate,
              paymentDate: new Date().toISOString().split('T')[0],
              vendaId,
              orderId: vendaId,
              paymentMethod,
              createdAt: new Date().toISOString()
            };
            await db.fluxoDeCaixa.put(fluxoEntry);
            await db.financialTransactions.put(fluxoEntry);
          }
        }
      );

      setIsSubmitting(false);
      onSaleComplete(newVenda, newItemsVenda);
      onClose();
    } catch (err) {
      console.error('Erro ao finalizar venda atômica:', err);
      setErrorMessage('Erro ao registrar a venda no banco de dados. Tente novamente.');
      setIsSubmitting(false);
    }
  };

  // Filter available products for adding
  const filteredProductsSelect = products.filter((p) => {
    const term = productSearch.toLowerCase();
    return (
      p.name.toLowerCase().includes(term) ||
      p.code.toLowerCase().includes(term) ||
      (p.barcode && p.barcode.toLowerCase().includes(term))
    );
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-stone-200 my-auto overflow-hidden animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="p-5 border-b border-stone-100 bg-stone-50/80 flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center space-x-2 text-rose-600">
            <ShoppingCart className="w-6 h-6" />
            <div>
              <h2 className="text-base font-bold text-stone-900">Montagem de Cesta & Nova Venda</h2>
              <p className="text-xs text-stone-500">Adicione itens, confira estoque e margem de lucro antes de finalizar.</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-stone-400 hover:text-stone-700 hover:bg-stone-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body Form */}
        <form onSubmit={handleSubmitSale} className="p-6 overflow-y-auto space-y-6 text-xs">
          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl flex items-center space-x-2 font-medium">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Section 1: Item Picker & Basket Assembly */}
          <div className="space-y-3 bg-stone-50/70 p-4 rounded-2xl border border-stone-200/80">
            <h3 className="font-bold text-stone-900 uppercase tracking-wider text-[11px] flex items-center space-x-1.5 text-rose-700">
              <Package className="w-4 h-4" />
              <span>1. Adicionar Itens à Cesta</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-2 items-end">
              {/* Product Select */}
              <div className="md:col-span-7">
                <label className="block text-stone-700 font-semibold mb-1">Buscar & Selecionar Produto</label>
                <select
                  value={selectedProductId}
                  onChange={(e) => setSelectedProductId(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-stone-200 rounded-xl text-xs font-medium focus:outline-none focus:border-rose-500"
                >
                  <option value="">Escolha um produto do estoque...</option>
                  {filteredProductsSelect.map((p) => (
                    <option key={p.id} value={p.id} disabled={p.stockQuantity <= 0}>
                      {p.name} — {formatCurrency(p.salePrice)} (Estoque: {p.stockQuantity} un)
                    </option>
                  ))}
                </select>
              </div>

              {/* Quantity */}
              <div className="md:col-span-3">
                <label className="block text-stone-700 font-semibold mb-1">Quantidade</label>
                <input
                  type="number"
                  min="1"
                  value={addQty}
                  onChange={(e) => setAddQty(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-stone-200 rounded-xl text-xs font-bold focus:outline-none focus:border-rose-500 text-center"
                />
              </div>

              {/* Add Button */}
              <div className="md:col-span-2">
                <button
                  type="button"
                  onClick={handleAddItem}
                  className="w-full py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs transition-colors flex items-center justify-center space-x-1 shadow-xs"
                >
                  <Plus className="w-4 h-4" />
                  <span>Adicionar</span>
                </button>
              </div>
            </div>

            {/* Basket Items List */}
            <div className="pt-3">
              <span className="font-bold text-stone-700 block mb-2">Itens Selecionados na Cesta:</span>
              {basketItems.length === 0 ? (
                <div className="p-6 bg-white border border-dashed border-stone-300 rounded-xl text-center text-stone-400">
                  Sua cesta está vazia. Selecione um produto acima e clique em "Adicionar".
                </div>
              ) : (
                <div className="bg-white rounded-xl border border-stone-200 overflow-hidden divide-y divide-stone-100">
                  {basketItems.map((bi) => (
                    <div key={bi.product.id} className="p-3 flex items-center justify-between gap-2 hover:bg-stone-50/50">
                      <div className="flex-1 min-w-0">
                        <span className="font-bold text-stone-900 block truncate">{bi.product.name}</span>
                        <span className="text-[10px] text-stone-400">
                          Unitário: {formatCurrency(bi.unitPrice)} | Custo Unit.: {formatCurrency(bi.product.costPrice)}
                        </span>
                      </div>

                      {/* Qty Controls */}
                      <div className="flex items-center space-x-1.5 bg-stone-100 p-1 rounded-lg">
                        <button
                          type="button"
                          onClick={() => handleUpdateItemQty(bi.product.id, bi.quantity - 1)}
                          className="w-6 h-6 bg-white text-stone-800 font-bold rounded flex items-center justify-center shadow-2xs hover:bg-stone-200"
                        >
                          -
                        </button>
                        <span className="font-bold px-1 text-stone-900">{bi.quantity}</span>
                        <button
                          type="button"
                          onClick={() => handleUpdateItemQty(bi.product.id, bi.quantity + 1)}
                          className="w-6 h-6 bg-white text-stone-800 font-bold rounded flex items-center justify-center shadow-2xs hover:bg-stone-200"
                        >
                          +
                        </button>
                      </div>

                      <div className="text-right min-w-[80px]">
                        <span className="font-bold text-stone-900 block">{formatCurrency(bi.quantity * bi.unitPrice)}</span>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemoveItem(bi.product.id)}
                        className="p-1.5 text-stone-400 hover:text-rose-600 rounded-lg hover:bg-rose-50"
                        title="Remover"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Live Financial Metrics Banner */}
            {basketItems.length > 0 && (
              <div className="mt-3 p-3 bg-white border border-stone-200 rounded-xl grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                <div>
                  <span className="text-[10px] uppercase font-bold text-stone-400 block">Custo Total</span>
                  <span className="text-xs font-bold text-stone-700">{formatCurrency(totalCostPrice)}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-stone-400 block">Preço de Venda</span>
                  <span className="text-xs font-bold text-emerald-700">{formatCurrency(totalSalePrice)}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-stone-400 block">Lucro Bruto (R$)</span>
                  <span className={`text-xs font-bold ${profitAmount >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {formatCurrency(profitAmount)}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-stone-400 block">Margem (%)</span>
                  <span className={`text-xs font-bold ${profitAmount >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {marginPercent}%
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Section 2: Customer & Delivery Information */}
          <div className="space-y-3 bg-stone-50/70 p-4 rounded-2xl border border-stone-200/80">
            <h3 className="font-bold text-stone-900 uppercase tracking-wider text-[11px] flex items-center space-x-1.5 text-stone-800">
              <User className="w-4 h-4 text-rose-600" />
              <span>2. Cliente & Dados de Entrega</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Select Client */}
              <div>
                <label className="block text-stone-700 font-semibold mb-1">Cliente Cadastrado</label>
                <select
                  value={selectedClientId}
                  onChange={handleClientChange}
                  className="w-full px-3 py-2 bg-white border border-stone-200 rounded-xl text-xs font-medium focus:outline-none focus:border-rose-500"
                >
                  <option value="">-- Venda Rápida / Não Cadastrado --</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.phone})
                    </option>
                  ))}
                </select>
              </div>

              {/* Unregistered Client Name if not selected */}
              {!selectedClientId && (
                <div>
                  <label className="block text-stone-700 font-semibold mb-1">Nome do Cliente (Sem Cadastro)</label>
                  <input
                    type="text"
                    value={unregisteredClientName}
                    onChange={(e) => setUnregisteredClientName(e.target.value)}
                    placeholder="Ex: Maria Fernandes"
                    className="w-full px-3 py-2 bg-white border border-stone-200 rounded-xl text-xs font-medium focus:outline-none focus:border-rose-500"
                  />
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-stone-700 font-semibold mb-1">Data da Entrega</label>
                <input
                  type="date"
                  value={deliveryDate}
                  onChange={(e) => setDeliveryDate(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-stone-200 rounded-xl text-xs font-medium focus:outline-none focus:border-rose-500"
                />
              </div>

              <div>
                <label className="block text-stone-700 font-semibold mb-1">Período de Entrega</label>
                <select
                  value={deliveryPeriod}
                  onChange={(e) => setDeliveryPeriod(e.target.value as DeliveryPeriod)}
                  className="w-full px-3 py-2 bg-white border border-stone-200 rounded-xl text-xs font-medium focus:outline-none focus:border-rose-500"
                >
                  <option value="manha_cedo">Manhã Cedo (06:00 - 08:00)</option>
                  <option value="manha_padrao">Manhã Padrão (08:00 - 11:30)</option>
                  <option value="tarde">Tarde (13:30 - 17:00)</option>
                  <option value="horario_fixo">Horário Agendado Fixo</option>
                </select>
              </div>

              <div>
                <label className="block text-stone-700 font-semibold mb-1">Destinatário</label>
                <input
                  type="text"
                  value={recipientName}
                  onChange={(e) => setRecipientName(e.target.value)}
                  placeholder="Nome de quem vai receber a cesta"
                  className="w-full px-3 py-2 bg-white border border-stone-200 rounded-xl text-xs font-medium focus:outline-none focus:border-rose-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-stone-700 font-semibold mb-1">Endereço de Entrega</label>
              <input
                type="text"
                value={deliveryAddress}
                onChange={(e) => setDeliveryAddress(e.target.value)}
                placeholder="Rua, número, complemento, bairro"
                className="w-full px-3 py-2 bg-white border border-stone-200 rounded-xl text-xs font-medium focus:outline-none focus:border-rose-500"
              />
            </div>

            <div>
              <label className="block text-stone-700 font-semibold mb-1">Mensagem do Cartão de Presente</label>
              <textarea
                rows={2}
                value={cardMessage}
                onChange={(e) => setCardMessage(e.target.value)}
                placeholder="Escreva a mensagem personalizada para o cartão..."
                className="w-full px-3 py-2 bg-white border border-stone-200 rounded-xl text-xs font-medium focus:outline-none focus:border-rose-500 resize-none"
              />
            </div>
          </div>

          {/* Section 3: Payment & Grand Totals */}
          <div className="space-y-3 bg-stone-50/70 p-4 rounded-2xl border border-stone-200/80">
            <h3 className="font-bold text-stone-900 uppercase tracking-wider text-[11px] flex items-center space-x-1.5 text-stone-800">
              <CreditCard className="w-4 h-4 text-emerald-600" />
              <span>3. Pagamento & Totais</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-stone-700 font-semibold mb-1">Forma de Pagamento</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                  className="w-full px-3 py-2 bg-white border border-stone-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-rose-500"
                >
                  <option value="pix">Pix</option>
                  <option value="dinheiro">Dinheiro</option>
                  <option value="cartao_debito">Cartão de Débito</option>
                  <option value="cartao_credito">Cartão de Crédito</option>
                  <option value="transferencia">Transferência Bancária</option>
                  <option value="outro">Outro / Cortesia</option>
                  <option value="faturado">Faturado / A Prazo</option>
                </select>
              </div>

              <div>
                <label className="block text-stone-700 font-semibold mb-1">Status do Pagamento</label>
                <select
                  value={paymentStatus}
                  onChange={(e) => setPaymentStatus(e.target.value as PaymentStatus)}
                  className="w-full px-3 py-2 bg-white border border-stone-200 rounded-xl text-xs font-bold focus:outline-none focus:border-rose-500 text-emerald-700"
                >
                  <option value="pago">PAGO ✅</option>
                  <option value="parcial">PARCIALMENTE PAGO 🔄</option>
                  <option value="pendente">PENDENTE ⏳</option>
                </select>
              </div>

              <div>
                <label className="block text-stone-700 font-semibold mb-1">Taxa de Entrega (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={deliveryFee}
                  onChange={(e) => setDeliveryFee(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-stone-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-rose-500"
                />
              </div>

              <div>
                <label className="block text-stone-700 font-semibold mb-1">Desconto (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={discount}
                  onChange={(e) => setDiscount(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-stone-200 rounded-xl text-xs font-semibold text-rose-600 focus:outline-none focus:border-rose-500"
                />
              </div>
            </div>

            {/* Cash Payment Extra Fields: Received Amount and Change Calculation */}
            {paymentMethod === 'dinheiro' && (
              <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                <div>
                  <label className="block text-emerald-800 font-bold mb-1">Valor Recebido do Cliente (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder={`Ex: ${grandTotal.toFixed(2)}`}
                    value={receivedAmount}
                    onChange={(e) => setReceivedAmount(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-emerald-300 rounded-xl text-xs font-bold text-stone-900 focus:outline-none focus:border-emerald-600"
                  />
                </div>
                <div className="bg-white p-2.5 rounded-xl border border-emerald-200 text-right">
                  <span className="text-[10px] text-emerald-600 uppercase font-bold block">Troco a Devolver</span>
                  <span className="text-lg font-black text-emerald-700">{formatCurrency(changeVal)}</span>
                </div>
              </div>
            )}

            <div>
              <label className="block text-stone-700 font-semibold mb-1">Observações da Venda (Opcional)</label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ex: Cliente solicitou nota fiscal ou embalagem especial"
                className="w-full px-3 py-2 bg-white border border-stone-200 rounded-xl text-xs font-medium focus:outline-none focus:border-rose-500"
              />
            </div>

            {/* Total Grand Footer */}
            <div className="pt-3 border-t border-stone-200 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-stone-400 uppercase font-bold block">Responsável pela Venda</span>
                <span className="font-bold text-stone-700">Administrador AFETO (usr_admin_01)</span>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-stone-500 uppercase font-bold block">Total a Pagar</span>
                <span className="text-xl font-black text-emerald-700">{formatCurrency(grandTotal)}</span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl font-semibold transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting || basketItems.length === 0}
              className="px-6 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold transition-all shadow-md flex items-center space-x-2 active:scale-95 disabled:opacity-50"
            >
              {isSubmitting ? (
                <span>Processando Venda...</span>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Finalizar e Gerar Comprovante</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
