import React, { useState } from 'react';
import {
  X,
  Printer,
  Download,
  Share2,
  MessageCircle,
  CheckCircle2,
  Store,
  Calendar,
  User,
  MapPin,
  CreditCard,
  Copy,
  PackageCheck
} from 'lucide-react';
import { Venda, ItemVenda, Client } from '../../types';
import { formatCurrency, formatDateTime, formatDate } from '../../utils/formatters';
import { jsPDF } from 'jspdf';

interface SaleReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  venda: Venda | null;
  items: ItemVenda[];
  client?: Client | null;
}

export const SaleReceiptModal: React.FC<SaleReceiptModalProps> = ({
  isOpen,
  onClose,
  venda,
  items,
  client
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen || !venda) return null;

  const storeName = 'AFETO - Cestas & Presentes Artesanais';
  const storePhone = '(92) 99123-4567';
  const storeInstagram = '@afetocestas';

  const clientName = client?.name || venda.recipientName || 'Cliente não identificado';
  const clientPhone = client?.phone || venda.recipientPhone || '-';

  // Format WhatsApp Share message
  const getWhatsAppReceiptMessage = () => {
    const itemsList = items
      .map((i) => `• ${i.quantity}x (R$ ${i.unitPrice.toFixed(2)}) = R$ ${i.totalPrice.toFixed(2)}`)
      .join('\n');

    return `🌸 *COMPROVANTE DE VENDA - AFETO* 🌸\n` +
      `------------------------------------\n` +
      `🧾 *Pedido:* #${venda.orderNumber}\n` +
      `📅 *Data:* ${formatDateTime(venda.createdAt)}\n` +
      `👤 *Cliente:* ${clientName}\n` +
      `📍 *Entrega:* ${venda.deliveryAddress || 'Retirada na loja'}\n` +
      `------------------------------------\n` +
      `🛒 *ITENS DO PEDIDO:*\n${itemsList || '• Cesta AFETO Personalizada'}\n` +
      `------------------------------------\n` +
      `Subtotal: ${formatCurrency(venda.subtotal)}\n` +
      (venda.deliveryFee > 0 ? `Taxa de Entrega: ${formatCurrency(venda.deliveryFee)}\n` : '') +
      (venda.discount > 0 ? `Desconto: -${formatCurrency(venda.discount)}\n` : '') +
      `💰 *TOTAL GERAL: ${formatCurrency(venda.totalAmount)}*\n` +
      `💳 *Forma de Pagamento:* ${venda.paymentMethod.toUpperCase()} (${venda.paymentStatus === 'pago' ? 'PAGO ✅' : 'PENDENTE ⏳'})\n` +
      `------------------------------------\n` +
      `Obrigado pela preferência! Com carinho, AFETO. ❤️`;
  };

  const handleCopyText = () => {
    const msg = getWhatsAppReceiptMessage();
    navigator.clipboard.writeText(msg);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSendWhatsApp = () => {
    const cleanPhone = (client?.whatsapp || clientPhone).replace(/\D/g, '');
    const msg = encodeURIComponent(getWhatsAppReceiptMessage());
    let url = `https://wa.me/${cleanPhone}?text=${msg}`;
    if (!cleanPhone || cleanPhone.length < 8) {
      url = `https://api.whatsapp.com/send?text=${msg}`;
    }
    window.open(url, '_blank');
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = () => {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: [80, 200] // Thermal receipt style width 80mm
    });

    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('AFETO CESTAS', 40, 10, { align: 'center' });
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(8);
    doc.text('Presentes & Cestas Artesanais', 40, 14, { align: 'center' });
    doc.text(`Tel: ${storePhone} | ${storeInstagram}`, 40, 18, { align: 'center' });

    doc.text('----------------------------------------------------', 40, 22, { align: 'center' });
    doc.setFont('Helvetica', 'bold');
    doc.text(`COMPROVANTE DE VENDA #${venda.orderNumber}`, 40, 26, { align: 'center' });
    doc.setFont('Helvetica', 'normal');

    let y = 32;
    doc.text(`Data: ${formatDateTime(venda.createdAt)}`, 5, y); y += 4;
    doc.text(`Cliente: ${clientName}`, 5, y); y += 4;
    doc.text(`Endereço: ${venda.deliveryAddress || 'Retirada'}`, 5, y); y += 5;

    doc.text('----------------------------------------------------', 40, y, { align: 'center' }); y += 4;
    doc.setFont('Helvetica', 'bold');
    doc.text('ITENS:', 5, y); y += 4;
    doc.setFont('Helvetica', 'normal');

    items.forEach((item) => {
      const line = `${item.quantity}x ${item.unitPrice.toFixed(2)} = ${formatCurrency(item.totalPrice)}`;
      doc.text(line.substring(0, 38), 5, y);
      y += 4;
    });

    doc.text('----------------------------------------------------', 40, y, { align: 'center' }); y += 4;

    doc.text(`Subtotal: ${formatCurrency(venda.subtotal)}`, 5, y); y += 4;
    if (venda.deliveryFee > 0) {
      doc.text(`Taxa Entrega: ${formatCurrency(venda.deliveryFee)}`, 5, y); y += 4;
    }
    if (venda.discount > 0) {
      doc.text(`Desconto: -${formatCurrency(venda.discount)}`, 5, y); y += 4;
    }

    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(9);
    doc.text(`TOTAL: ${formatCurrency(venda.totalAmount)}`, 5, y); y += 5;

    doc.setFontSize(8);
    doc.setFont('Helvetica', 'normal');
    doc.text(`Pagamento: ${venda.paymentMethod.toUpperCase()} (${venda.paymentStatus.toUpperCase()})`, 5, y); y += 8;

    doc.text('Obrigado por escolher a AFETO!', 40, y, { align: 'center' });

    doc.save(`Comprovante_${venda.orderNumber}.pdf`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-stone-200 my-auto animate-in fade-in zoom-in duration-200">
        {/* Header Actions */}
        <div className="flex items-center justify-between pb-4 border-b border-stone-100 print:hidden">
          <div className="flex items-center space-x-2 text-rose-600">
            <PackageCheck className="w-5 h-5" />
            <h3 className="text-sm font-bold text-stone-900">Comprovante da Venda</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* PRINTABLE RECEIPT CONTAINER */}
        <div id="printable-receipt" className="p-6 bg-stone-50/50 rounded-2xl border border-stone-200 my-4 space-y-4 font-sans text-xs text-stone-800">
          {/* Store Header */}
          <div className="text-center space-y-1 pb-3 border-b border-dashed border-stone-300">
            <div className="inline-flex items-center space-x-1 text-rose-600 font-black text-base uppercase tracking-wider">
              <Store className="w-4 h-4" />
              <span>AFETO</span>
            </div>
            <p className="text-[11px] font-bold text-stone-700">Cestas & Presentes Artesanais</p>
            <p className="text-[10px] text-stone-500">Contato: {storePhone} • Instagram: {storeInstagram}</p>
          </div>

          {/* Sale Info */}
          <div className="space-y-1 text-[11px] border-b border-dashed border-stone-300 pb-3">
            <div className="flex justify-between font-bold text-stone-900">
              <span>Pedido: #{venda.orderNumber}</span>
              <span>{formatDateTime(venda.createdAt)}</span>
            </div>
            <div className="flex items-center space-x-1 text-stone-600">
              <User className="w-3.5 h-3.5 text-stone-400 shrink-0" />
              <span className="font-semibold text-stone-800">{clientName}</span>
              {clientPhone !== '-' && <span className="text-stone-400">({clientPhone})</span>}
            </div>
            {venda.deliveryAddress && (
              <div className="flex items-start space-x-1 text-stone-600">
                <MapPin className="w-3.5 h-3.5 text-stone-400 shrink-0 mt-0.5" />
                <span>{venda.deliveryAddress}</span>
              </div>
            )}
            {venda.deliveryDate && (
              <div className="flex items-center space-x-1 text-stone-500">
                <Calendar className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                <span>Data de Entrega: {formatDate(venda.deliveryDate)} ({venda.deliveryPeriod || 'Comercial'})</span>
              </div>
            )}
          </div>

          {/* Item List */}
          <div className="space-y-2 border-b border-dashed border-stone-300 pb-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block">Itens da Cesta / Pedido</span>
            {items.length > 0 ? (
              <div className="space-y-1.5">
                {items.map((item) => (
                  <div key={item.id} className="flex items-center justify-between text-[11px]">
                    <div className="font-medium text-stone-800">
                      <span>{item.quantity}x </span>
                      <span>Item #{item.productId || item.basketId || 'Produto'}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-stone-400 text-[10px] mr-1 font-mono">({formatCurrency(item.unitPrice)})</span>
                      <span className="font-bold text-stone-900">{formatCurrency(item.totalPrice)}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-[11px] font-medium text-stone-700 italic">
                Cesta de Café da Manhã Exclusiva AFETO
              </div>
            )}
          </div>

          {/* Totals */}
          <div className="space-y-1.5 pt-1 text-[11px]">
            <div className="flex justify-between text-stone-600">
              <span>Subtotal:</span>
              <span>{formatCurrency(venda.subtotal)}</span>
            </div>
            {venda.deliveryFee > 0 && (
              <div className="flex justify-between text-stone-600">
                <span>Taxa de Entrega:</span>
                <span>{formatCurrency(venda.deliveryFee)}</span>
              </div>
            )}
            {venda.discount > 0 && (
              <div className="flex justify-between text-rose-600 font-medium">
                <span>Desconto:</span>
                <span>-{formatCurrency(venda.discount)}</span>
              </div>
            )}
            <div className="flex justify-between items-center text-sm font-black text-stone-900 pt-2 border-t border-stone-200">
              <span>Total Pago:</span>
              <span className="text-emerald-700 text-base">{formatCurrency(venda.totalAmount)}</span>
            </div>
            <div className="flex justify-between items-center text-[10px] text-stone-500 pt-1">
              <span>Forma de Pagamento:</span>
              <span className="font-bold uppercase bg-stone-200/80 text-stone-800 px-2 py-0.5 rounded-md">
                {venda.paymentMethod.replace('_', ' ')} ({venda.paymentStatus})
              </span>
            </div>
            {venda.receivedAmount && venda.receivedAmount > 0 && (
              <div className="flex justify-between text-stone-600 text-[10px]">
                <span>Valor Recebido:</span>
                <span>{formatCurrency(venda.receivedAmount)}</span>
              </div>
            )}
            {venda.changeAmount && venda.changeAmount > 0 ? (
              <div className="flex justify-between text-emerald-700 font-bold text-[10px]">
                <span>Troco:</span>
                <span>{formatCurrency(venda.changeAmount)}</span>
              </div>
            ) : null}
          </div>

          {/* Footer Note */}
          <div className="text-center pt-3 border-t border-dashed border-stone-300 text-[10px] text-stone-500 space-y-0.5">
            <p className="font-bold text-stone-700">Agradecemos a sua preferência!</p>
            <p>Comprovante gerado digitalmente pelo Sistema AFETO.</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 print:hidden">
          <button
            onClick={handlePrint}
            className="px-3 py-2 bg-stone-100 hover:bg-stone-200 text-stone-800 font-bold rounded-xl text-xs flex items-center justify-center space-x-1.5 transition-colors"
          >
            <Printer className="w-3.5 h-3.5 text-stone-600" />
            <span>Imprimir</span>
          </button>

          <button
            onClick={handleDownloadPDF}
            className="px-3 py-2 bg-stone-100 hover:bg-stone-200 text-stone-800 font-bold rounded-xl text-xs flex items-center justify-center space-x-1.5 transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-rose-600" />
            <span>PDF</span>
          </button>

          <button
            onClick={handleCopyText}
            className="px-3 py-2 bg-stone-100 hover:bg-stone-200 text-stone-800 font-bold rounded-xl text-xs flex items-center justify-center space-x-1.5 transition-colors"
          >
            <Copy className="w-3.5 h-3.5 text-stone-600" />
            <span>{copied ? 'Copiado!' : 'Copiar'}</span>
          </button>

          <button
            onClick={handleSendWhatsApp}
            className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center justify-center space-x-1.5 transition-colors shadow-xs"
          >
            <MessageCircle className="w-3.5 h-3.5" />
            <span>WhatsApp</span>
          </button>
        </div>
      </div>
    </div>
  );
};
