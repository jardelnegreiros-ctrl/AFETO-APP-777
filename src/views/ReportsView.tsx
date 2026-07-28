import React, { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  FileText,
  Download,
  Filter,
  Calendar,
  Users,
  Tag,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Printer,
  FileSpreadsheet,
  CheckCircle2,
  Clock,
  Search,
  Receipt,
  Eye,
  X,
  PieChart,
  ListFilter
} from 'lucide-react';
import { db } from '../db';
import { useAuth } from '../context/AuthContext';
import { Venda, FluxoDeCaixa, Client, Category, ItemVenda, Product } from '../types';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

type ReportTab = 'extrato' | 'lucro' | 'fluxodecaixa';

export const ReportsView: React.FC = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [activeTab, setActiveTab] = useState<ReportTab>('extrato');

  // Filters State
  const [selectedClientId, setSelectedClientId] = useState<string>('todos');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('todas');
  const [receiptModalOrder, setReceiptModalOrder] = useState<Venda | null>(null);

  // Dexie Queries
  const vendas = useLiveQuery(() => db.vendas.toArray(), []) || [];
  const fluxos = useLiveQuery(() => db.fluxoDeCaixa.toArray(), []) || [];
  const clientes = useLiveQuery(() => db.clientes.toArray(), []) || [];
  const categorias = useLiveQuery(() => db.categorias.toArray(), []) || [];
  const itensVenda = useLiveQuery(() => db.itensVenda.toArray(), []) || [];
  const produtos = useLiveQuery(() => db.produtos.toArray(), []) || [];

  // Quick Preset Filters for Dates
  const handlePresetDate = (preset: 'hoje' | '7dias' | 'esteMes' | 'limpar') => {
    const now = new Date();
    if (preset === 'hoje') {
      const todayStr = now.toISOString().split('T')[0];
      setStartDate(todayStr);
      setEndDate(todayStr);
    } else if (preset === '7dias') {
      const past7 = new Date();
      past7.setDate(now.getDate() - 7);
      setStartDate(past7.toISOString().split('T')[0]);
      setEndDate(now.toISOString().split('T')[0]);
    } else if (preset === 'esteMes') {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      setStartDate(firstDay.toISOString().split('T')[0]);
      setEndDate(now.toISOString().split('T')[0]);
    } else {
      setStartDate('');
      setEndDate('');
    }
  };

  // Helper to filter dates
  const isWithinDateRange = (dateStr: string) => {
    if (!dateStr) return true;
    const cleanDate = dateStr.split('T')[0];
    if (startDate && cleanDate < startDate) return false;
    if (endDate && cleanDate > endDate) return false;
    return true;
  };

  // 1. Filtered Vendas
  const filteredVendas = useMemo(() => {
    return vendas.filter((v) => {
      // Filter Client
      if (selectedClientId !== 'todos' && v.clientId !== selectedClientId) {
        return false;
      }
      // Filter Date (deliveryDate or createdAt)
      const targetDate = v.deliveryDate || v.createdAt;
      if (!isWithinDateRange(targetDate)) {
        return false;
      }
      // Filter Category (if order contains items from category)
      if (selectedCategory !== 'todas') {
        const vItems = itensVenda.filter((i) => i.vendaId === v.id || i.orderId === v.id);
        const hasCategory = vItems.some((i) => {
          if (!i.productId) return false;
          const prod = produtos.find((p) => p.id === i.productId);
          return prod && prod.categoryId === selectedCategory;
        });
        if (!hasCategory) return false;
      }
      return true;
    });
  }, [vendas, selectedClientId, startDate, endDate, selectedCategory, itensVenda, produtos]);

  // 2. Filtered Financial Cash Flow Records
  const filteredFluxos = useMemo(() => {
    return fluxos.filter((f) => {
      if (selectedClientId !== 'todos' && f.vendaId) {
        const relatedVenda = vendas.find((v) => v.id === f.vendaId);
        if (relatedVenda && relatedVenda.clientId !== selectedClientId) {
          return false;
        }
      }
      const targetDate = f.dueDate || f.createdAt;
      if (!isWithinDateRange(targetDate)) {
        return false;
      }
      if (selectedCategory !== 'todas' && f.category !== selectedCategory) {
        return false;
      }
      return true;
    });
  }, [fluxos, selectedClientId, startDate, endDate, selectedCategory, vendas]);

  // Profit Calculations
  const metrics = useMemo(() => {
    const totalVendas = filteredVendas.reduce((sum, v) => sum + (v.totalAmount || 0), 0);

    // Calculate cost of goods sold for filtered vendas
    let totalInsumosCost = 0;
    filteredVendas.forEach((v) => {
      const items = itensVenda.filter((i) => i.vendaId === v.id || i.orderId === v.id);
      items.forEach((item) => {
        if (item.productId) {
          const prod = produtos.find((p) => p.id === item.productId);
          if (prod) {
            totalInsumosCost += (prod.costPrice || 0) * item.quantity;
          }
        }
      });
    });

    // Despesas de caixa
    const totalDespesasCaixa = filteredFluxos
      .filter((f) => f.type === 'despesa')
      .reduce((sum, f) => sum + (f.amount || 0), 0);

    const totalCustos = totalInsumosCost + totalDespesasCaixa;
    const lucroLiquido = totalVendas - totalCustos;
    const margemLucro = totalVendas > 0 ? (lucroLiquido / totalVendas) * 100 : 0;

    return {
      totalVendas,
      totalInsumosCost,
      totalDespesasCaixa,
      totalCustos,
      lucroLiquido,
      margemLucro
    };
  }, [filteredVendas, filteredFluxos, itensVenda, produtos]);

  // Export to PDF using jsPDF
  const exportToPDF = () => {
    const doc = new jsPDF();

    // Title Header
    doc.setFontSize(18);
    doc.setTextColor(225, 29, 72); // Rose primary color
    doc.text('AFETO CESTAS & PRESENTES', 14, 20);

    doc.setFontSize(12);
    doc.setTextColor(50, 50, 50);
    const reportTitle =
      activeTab === 'extrato'
        ? 'Relatório de Extrato Geral'
        : activeTab === 'lucro'
        ? 'Demonstrativo de Lucros e Custos'
        : 'Relatório de Fluxo de Caixa';
    doc.text(reportTitle, 14, 28);

    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, 14, 34);

    if (startDate || endDate) {
      doc.text(`Período: ${startDate || 'Início'} até ${endDate || 'Hoje'}`, 14, 40);
    }

    if (activeTab === 'extrato' || activeTab === 'fluxodecaixa') {
      const tableData = filteredVendas.map((v) => {
        const clientObj = clientes.find((c) => c.id === v.clientId);
        return [
          `#${v.orderNumber}`,
          v.deliveryDate ? new Date(v.deliveryDate).toLocaleDateString('pt-BR') : '-',
          clientObj ? clientObj.name : 'Cliente Avulso',
          v.paymentMethod.toUpperCase(),
          v.paymentStatus.toUpperCase(),
          `R$ ${v.totalAmount.toFixed(2)}`
        ];
      });

      autoTable(doc, {
        startY: startDate || endDate ? 46 : 40,
        head: [['Pedido', 'Data', 'Cliente', 'Pagamento', 'Status', 'Valor Total']],
        body: tableData,
        theme: 'grid',
        headStyles: { fillColor: [225, 29, 72], textColor: 255 },
        styles: { fontSize: 8 }
      });
    } else {
      // Lucro Tab Report
      const summaryBody = [
        ['Receita Total de Vendas', `R$ ${metrics.totalVendas.toFixed(2)}`],
        ['(-) Custo dos Insumos / Produtos', `R$ ${metrics.totalInsumosCost.toFixed(2)}`],
        ['(-) Despesas Operacionais de Caixa', `R$ ${metrics.totalDespesasCaixa.toFixed(2)}`],
        ['(=) Lucro Líquido Operacional', `R$ ${metrics.lucroLiquido.toFixed(2)}`],
        ['Margem de Lucro (%)', `${metrics.margemLucro.toFixed(1)}%`]
      ];

      autoTable(doc, {
        startY: 46,
        head: [['Métrica Financeira', 'Valor (R$)']],
        body: summaryBody,
        theme: 'striped',
        headStyles: { fillColor: [225, 29, 72], textColor: 255 }
      });
    }

    doc.save(`relatorio_afeto_${activeTab}_${Date.now()}.pdf`);
  };

  // Export to Excel using XLSX
  const exportToExcel = () => {
    const dataToExport = filteredVendas.map((v) => {
      const clientObj = clientes.find((c) => c.id === v.clientId);
      return {
        'Número do Pedido': v.orderNumber,
        'Data de Entrega': v.deliveryDate,
        'Cliente': clientObj ? clientObj.name : 'Avulso',
        'Destinatário': v.recipientName,
        'Endereço': v.deliveryAddress,
        'Forma de Pagamento': v.paymentMethod,
        'Status Pagamento': v.paymentStatus,
        'Status Pedido': v.status,
        'Valor Total (R$)': v.totalAmount
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Relatório AFETO');
    XLSX.writeFile(workbook, `relatorio_afeto_${activeTab}_${Date.now()}.xlsx`);
  };

  // Generate Receipt PDF
  const downloadReceiptPDF = (venda: Venda) => {
    const doc = new jsPDF();
    const client = clientes.find((c) => c.id === venda.clientId);
    const items = itensVenda.filter((i) => i.vendaId === venda.id || i.orderId === venda.id);

    // Header
    doc.setFontSize(16);
    doc.setTextColor(225, 29, 72);
    doc.text('AFETO CESTAS & PRESENTES', 14, 20);

    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text('COMPROVANTE DE VENDA E ENTREGA', 14, 26);
    doc.text(`Comprovante #${venda.orderNumber}`, 14, 32);

    doc.setLineWidth(0.5);
    doc.setDrawColor(220, 220, 220);
    doc.line(14, 36, 196, 36);

    // Customer & Order Info
    doc.setFontSize(9);
    doc.setTextColor(50, 50, 50);
    doc.text(`Cliente Comprador: ${client ? client.name : 'Não informado'}`, 14, 44);
    doc.text(`Telefone: ${client ? client.phone : '-'}`, 14, 50);
    doc.text(`Destinatário: ${venda.recipientName}`, 14, 56);
    doc.text(`Data de Entrega: ${venda.deliveryDate ? new Date(venda.deliveryDate).toLocaleDateString('pt-BR') : '-'} (${venda.deliveryPeriod || 'Comercial'})`, 14, 62);
    doc.text(`Endereço: ${venda.deliveryAddress}`, 14, 68);

    if (venda.cardMessage) {
      doc.text(`Mensagem do Cartão: "${venda.cardMessage}"`, 14, 76);
    }

    // Items table
    const tableBody = items.map((it) => [
      `${it.quantity}x Item`,
      `R$ ${it.unitPrice.toFixed(2)}`,
      `R$ ${it.totalPrice.toFixed(2)}`
    ]);

    if (tableBody.length === 0) {
      tableBody.push(['Cesta AFETO Especial', `R$ ${venda.subtotal.toFixed(2)}`, `R$ ${venda.subtotal.toFixed(2)}`]);
    }

    autoTable(doc, {
      startY: venda.cardMessage ? 82 : 74,
      head: [['Descrição', 'Preço Un.', 'Total']],
      body: tableBody,
      theme: 'grid',
      headStyles: { fillColor: [40, 40, 40] }
    });

    const finalY = (doc as any).lastAutoTable.finalY + 10;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(`Subtotal: R$ ${(venda.subtotal || venda.totalAmount).toFixed(2)}`, 14, finalY);
    if (venda.deliveryFee) {
      doc.text(`Taxa de Entrega: R$ ${venda.deliveryFee.toFixed(2)}`, 14, finalY + 6);
    }
    doc.text(`VALOR TOTAL: R$ ${venda.totalAmount.toFixed(2)}`, 14, finalY + 12);
    doc.text(`Forma de Pagamento: ${venda.paymentMethod.toUpperCase()} (${venda.paymentStatus.toUpperCase()})`, 14, finalY + 18);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text('Obrigado por presentear com AFETO!', 14, finalY + 30);

    doc.save(`comprovante_venda_${venda.orderNumber}.pdf`);
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-stone-200/80 shadow-xs">
        <div>
          <div className="flex items-center space-x-2 text-rose-600 mb-1">
            <FileText className="w-5 h-5" />
            <span className="text-xs font-bold uppercase tracking-wider">Módulo de Relatórios</span>
          </div>
          <h1 className="text-2xl font-bold text-stone-900">Relatórios & Comprovantes</h1>
          <p className="text-xs text-stone-500 mt-0.5">
            Extratos operacionais, apuração de lucros, fluxo de caixa e emissão de comprovantes de venda em PDF.
          </p>
        </div>

        {/* Global Export Buttons */}
        <div className="flex items-center space-x-2">
          <button
            onClick={exportToPDF}
            className="px-3.5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-xl text-xs transition-all shadow-sm flex items-center space-x-1.5 active:scale-95"
          >
            <Download className="w-4 h-4" />
            <span>Exportar PDF</span>
          </button>
          <button
            onClick={exportToExcel}
            className="px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl text-xs transition-all shadow-sm flex items-center space-x-1.5 active:scale-95"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Exportar Excel</span>
          </button>
        </div>
      </div>

      {/* Filter Control Box */}
      <div className="bg-white border border-stone-200/80 rounded-2xl p-4 shadow-xs space-y-3">
        <div className="flex items-center space-x-2 text-xs font-bold text-stone-700 uppercase tracking-wider pb-2 border-b border-stone-100">
          <ListFilter className="w-4 h-4 text-rose-500" />
          <span>Filtros do Relatório</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          {/* Cliente Filter */}
          <div>
            <label className="block text-stone-500 font-semibold mb-1 flex items-center space-x-1">
              <Users className="w-3.5 h-3.5 text-stone-400" />
              <span>Cliente:</span>
            </label>
            <select
              value={selectedClientId}
              onChange={(e) => setSelectedClientId(e.target.value)}
              className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:border-rose-500"
            >
              <option value="todos">Todos os Clientes</option>
              {clientes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.phone})
                </option>
              ))}
            </select>
          </div>

          {/* Start Date */}
          <div>
            <label className="block text-stone-500 font-semibold mb-1 flex items-center space-x-1">
              <Calendar className="w-3.5 h-3.5 text-stone-400" />
              <span>Data Inicial:</span>
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:border-rose-500"
            />
          </div>

          {/* End Date */}
          <div>
            <label className="block text-stone-500 font-semibold mb-1 flex items-center space-x-1">
              <Calendar className="w-3.5 h-3.5 text-stone-400" />
              <span>Data Final:</span>
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:border-rose-500"
            />
          </div>

          {/* Category Filter */}
          <div>
            <label className="block text-stone-500 font-semibold mb-1 flex items-center space-x-1">
              <Tag className="w-3.5 h-3.5 text-stone-400" />
              <span>Categoria:</span>
            </label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:border-rose-500"
            >
              <option value="todas">Todas as Categorias</option>
              {categorias.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Quick Date Presets */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-stone-100 text-[11px]">
          <div className="flex items-center space-x-1">
            <span className="text-stone-400 font-medium mr-1">Atalhos de data:</span>
            <button
              onClick={() => handlePresetDate('hoje')}
              className="px-2.5 py-1 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg transition-colors font-medium"
            >
              Hoje
            </button>
            <button
              onClick={() => handlePresetDate('7dias')}
              className="px-2.5 py-1 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg transition-colors font-medium"
            >
              Últimos 7 dias
            </button>
            <button
              onClick={() => handlePresetDate('esteMes')}
              className="px-2.5 py-1 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg transition-colors font-medium"
            >
              Este Mês
            </button>
            <button
              onClick={() => handlePresetDate('limpar')}
              className="px-2.5 py-1 text-rose-600 hover:underline font-medium"
            >
              Limpar Datas
            </button>
          </div>

          <div className="text-stone-500">
            Filtrando <strong className="text-stone-900">{filteredVendas.length}</strong> pedido(s)
          </div>
        </div>
      </div>

      {/* Tabs Switcher */}
      <div className="flex items-center space-x-2 border-b border-stone-200/80 pb-1">
        <button
          onClick={() => setActiveTab('extrato')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 ${
            activeTab === 'extrato'
              ? 'bg-rose-600 text-white shadow-xs'
              : 'bg-white text-stone-600 hover:bg-stone-100 border border-stone-200/60'
          }`}
        >
          <Receipt className="w-4 h-4" />
          <span>Extrato de Vendas</span>
        </button>

        <button
          onClick={() => {
            if (isAdmin) {
              setActiveTab('lucro');
            } else {
              alert('A visualização de apuração de custos e lucros é restrita ao Administrador.');
            }
          }}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 ${
            activeTab === 'lucro'
              ? 'bg-rose-600 text-white shadow-xs'
              : 'bg-white text-stone-600 hover:bg-stone-100 border border-stone-200/60'
          } ${!isAdmin ? 'opacity-60 cursor-not-allowed' : ''}`}
          title={!isAdmin ? 'Acesso restrito ao Administrador' : ''}
        >
          <TrendingUp className="w-4 h-4" />
          <span>Apuração de Lucro {!isAdmin && '🔒'}</span>
        </button>

        <button
          onClick={() => setActiveTab('fluxodecaixa')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 ${
            activeTab === 'fluxodecaixa'
              ? 'bg-rose-600 text-white shadow-xs'
              : 'bg-white text-stone-600 hover:bg-stone-100 border border-stone-200/60'
          }`}
        >
          <DollarSign className="w-4 h-4" />
          <span>Fluxo de Caixa</span>
        </button>
      </div>

      {/* Tab 1: Extrato */}
      {activeTab === 'extrato' && (
        <div className="bg-white border border-stone-200/80 rounded-2xl shadow-xs overflow-hidden">
          <div className="p-4 bg-stone-50 border-b border-stone-100 flex items-center justify-between">
            <h3 className="font-bold text-stone-900 text-sm">Extrato das Operações</h3>
            <span className="text-xs text-stone-500">
              Clique em "Comprovante" para emitir recibo do pedido
            </span>
          </div>

          {filteredVendas.length === 0 ? (
            <div className="p-12 text-center text-stone-400 text-xs">
              Nenhuma venda registrada no período ou filtro selecionado.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-stone-100/70 border-b border-stone-200/80 text-stone-500 font-bold">
                    <th className="py-3 px-4">Pedido</th>
                    <th className="py-3 px-4">Data Entrega</th>
                    <th className="py-3 px-4">Cliente</th>
                    <th className="py-3 px-4">Destinatário</th>
                    <th className="py-3 px-4">Pagamento</th>
                    <th className="py-3 px-4 text-right">Valor Total</th>
                    <th className="py-3 px-4 text-center">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {filteredVendas.map((venda) => {
                    const client = clientes.find((c) => c.id === venda.clientId);
                    return (
                      <tr key={venda.id} className="hover:bg-rose-50/30 transition-colors">
                        <td className="py-3 px-4 font-bold text-stone-900">#{venda.orderNumber}</td>
                        <td className="py-3 px-4 text-stone-600">
                          {venda.deliveryDate ? new Date(venda.deliveryDate).toLocaleDateString('pt-BR') : '-'}
                        </td>
                        <td className="py-3 px-4 font-medium text-stone-800">
                          {client ? client.name : 'Cliente Avulso'}
                        </td>
                        <td className="py-3 px-4 text-stone-600">{venda.recipientName}</td>
                        <td className="py-3 px-4">
                          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-stone-100 text-stone-700">
                            <span>{venda.paymentMethod.toUpperCase()}</span>
                            <span className={venda.paymentStatus === 'pago' ? 'text-emerald-600' : 'text-amber-600'}>
                              ({venda.paymentStatus})
                            </span>
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-stone-900">
                          R$ {venda.totalAmount.toFixed(2)}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <button
                            onClick={() => setReceiptModalOrder(venda)}
                            className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200/80 rounded-lg font-semibold text-[11px] inline-flex items-center space-x-1 transition-colors"
                          >
                            <Printer className="w-3 h-3" />
                            <span>Comprovante</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Lucro */}
      {activeTab === 'lucro' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white border border-stone-200/80 rounded-2xl p-4 shadow-xs">
              <span className="text-[10px] uppercase font-bold text-stone-400">Receita Bruta</span>
              <p className="text-2xl font-bold text-emerald-700 mt-1">
                R$ {metrics.totalVendas.toFixed(2)}
              </p>
              <p className="text-[10px] text-stone-400 mt-1">Total de vendas no período</p>
            </div>

            <div className="bg-white border border-stone-200/80 rounded-2xl p-4 shadow-xs">
              <span className="text-[10px] uppercase font-bold text-stone-400">Custos de Insumos</span>
              <p className="text-2xl font-bold text-amber-700 mt-1">
                R$ {metrics.totalInsumosCost.toFixed(2)}
              </p>
              <p className="text-[10px] text-stone-400 mt-1">Custo de mercadorias das cestas</p>
            </div>

            <div className="bg-white border border-stone-200/80 rounded-2xl p-4 shadow-xs">
              <span className="text-[10px] uppercase font-bold text-stone-400">Despesas Operacionais</span>
              <p className="text-2xl font-bold text-rose-700 mt-1">
                R$ {metrics.totalDespesasCaixa.toFixed(2)}
              </p>
              <p className="text-[10px] text-stone-400 mt-1">Saídas lançadas no caixa</p>
            </div>

            <div className="bg-stone-900 text-white border border-stone-800 rounded-2xl p-4 shadow-xs">
              <span className="text-[10px] uppercase font-bold text-stone-400">Lucro Líquido Real</span>
              <p className="text-2xl font-bold text-emerald-400 mt-1">
                R$ {metrics.lucroLiquido.toFixed(2)}
              </p>
              <p className="text-[10px] text-rose-300 mt-1 font-semibold">
                Margem Líquida: {metrics.margemLucro.toFixed(1)}%
              </p>
            </div>
          </div>

          {/* Breakdown Table */}
          <div className="bg-white border border-stone-200/80 rounded-2xl p-5 shadow-xs">
            <h3 className="font-bold text-stone-900 text-sm mb-3">Demonstrativo de Apuração do Resultado</h3>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-2 border-b border-stone-100">
                <span className="font-medium text-stone-700">(+) Receita de Vendas de Cestas</span>
                <span className="font-bold text-emerald-700">R$ {metrics.totalVendas.toFixed(2)}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-stone-100">
                <span className="font-medium text-stone-700">(-) Custo Direto dos Insumos/Produtos (BOM)</span>
                <span className="font-bold text-amber-700">- R$ {metrics.totalInsumosCost.toFixed(2)}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-stone-100">
                <span className="font-medium text-stone-700">(-) Despesas do Caixa (Aluguel, Energia, Embalagens)</span>
                <span className="font-bold text-rose-700">- R$ {metrics.totalDespesasCaixa.toFixed(2)}</span>
              </div>
              <div className="flex justify-between py-3 bg-stone-50 px-3 rounded-xl font-bold text-sm">
                <span className="text-stone-900">(=) LUCRO LÍQUIDO OPERACIONAL</span>
                <span className={metrics.lucroLiquido >= 0 ? 'text-emerald-700' : 'text-rose-700'}>
                  R$ {metrics.lucroLiquido.toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Fluxo de Caixa */}
      {activeTab === 'fluxodecaixa' && (
        <div className="bg-white border border-stone-200/80 rounded-2xl shadow-xs overflow-hidden">
          <div className="p-4 bg-stone-50 border-b border-stone-100 flex items-center justify-between">
            <h3 className="font-bold text-stone-900 text-sm">Lançamentos de Fluxo de Caixa</h3>
            <span className="text-xs text-stone-500">Movimentações de Entradas e Saídas</span>
          </div>

          {filteredFluxos.length === 0 ? (
            <div className="p-12 text-center text-stone-400 text-xs">
              Nenhum lançamento no fluxo de caixa no período selecionado.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-stone-100/70 border-b border-stone-200/80 text-stone-500 font-bold">
                    <th className="py-3 px-4">Tipo</th>
                    <th className="py-3 px-4">Data</th>
                    <th className="py-3 px-4">Descrição</th>
                    <th className="py-3 px-4">Categoria</th>
                    <th className="py-3 px-4 text-right">Valor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {filteredFluxos.map((f) => (
                    <tr key={f.id} className="hover:bg-stone-50 transition-colors">
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            f.type === 'receita'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {f.type.toUpperCase()}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-stone-600">
                        {f.dueDate ? new Date(f.dueDate).toLocaleDateString('pt-BR') : '-'}
                      </td>
                      <td className="py-3 px-4 font-medium text-stone-800">{f.description}</td>
                      <td className="py-3 px-4 text-stone-500">{f.category}</td>
                      <td
                        className={`py-3 px-4 text-right font-bold ${
                          f.type === 'receita' ? 'text-emerald-700' : 'text-rose-700'
                        }`}
                      >
                        {f.type === 'receita' ? '+' : '-'} R$ {f.amount.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Modal: Visualizar / Imprimir Comprovante de Venda */}
      {receiptModalOrder && (
        <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-stone-200 overflow-y-auto max-h-[90vh]">
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-stone-100 mb-4">
              <div className="flex items-center space-x-2">
                <Receipt className="w-5 h-5 text-rose-600" />
                <h3 className="text-lg font-bold text-stone-900">
                  Comprovante de Venda #{receiptModalOrder.orderNumber}
                </h3>
              </div>
              <button
                onClick={() => setReceiptModalOrder(null)}
                className="p-1.5 text-stone-400 hover:text-stone-700 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Printable Receipt Card Body */}
            <div className="p-5 border border-stone-200 rounded-2xl bg-stone-50/50 space-y-4 text-xs font-sans">
              <div className="text-center pb-3 border-b border-stone-200/80">
                <h2 className="font-serif font-bold text-lg text-stone-900 tracking-wide">AFETO</h2>
                <p className="text-[11px] text-stone-500">Cestas & Presentes Artesanais</p>
                <p className="text-[10px] text-stone-400 mt-0.5">Manaus - AM • (92) 99123-4567</p>
              </div>

              {/* Order Info */}
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div>
                  <span className="text-stone-400 block">Comprador:</span>
                  <strong className="text-stone-800">
                    {clientes.find((c) => c.id === receiptModalOrder.clientId)?.name || 'Cliente Avulso'}
                  </strong>
                </div>
                <div>
                  <span className="text-stone-400 block">Data de Entrega:</span>
                  <strong className="text-stone-800">
                    {receiptModalOrder.deliveryDate
                      ? new Date(receiptModalOrder.deliveryDate).toLocaleDateString('pt-BR')
                      : '-'}
                  </strong>
                </div>
                <div>
                  <span className="text-stone-400 block">Destinatário:</span>
                  <strong className="text-stone-800">{receiptModalOrder.recipientName}</strong>
                </div>
                <div>
                  <span className="text-stone-400 block">Pagamento:</span>
                  <strong className="text-stone-800">{receiptModalOrder.paymentMethod.toUpperCase()}</strong>
                </div>
              </div>

              <div>
                <span className="text-stone-400 block text-[11px]">Endereço:</span>
                <span className="text-stone-700 font-medium">{receiptModalOrder.deliveryAddress}</span>
              </div>

              {receiptModalOrder.cardMessage && (
                <div className="p-2.5 bg-rose-50 border border-rose-200/60 rounded-xl text-rose-800 italic">
                  "{receiptModalOrder.cardMessage}"
                </div>
              )}

              {/* Items Table */}
              <div className="pt-2">
                <span className="font-bold text-stone-800 block mb-1">Itens do Comprovante:</span>
                <div className="bg-white rounded-xl border border-stone-200/80 overflow-hidden">
                  <table className="w-full text-left text-[11px]">
                    <thead className="bg-stone-100 text-stone-600 font-semibold">
                      <tr>
                        <th className="py-2 px-3">Item</th>
                        <th className="py-2 px-3 text-right">Qtd</th>
                        <th className="py-2 px-3 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100">
                      {itensVenda
                        .filter((i) => i.vendaId === receiptModalOrder.id || i.orderId === receiptModalOrder.id)
                        .map((it) => (
                          <tr key={it.id}>
                            <td className="py-2 px-3 font-medium text-stone-800">Item Cesta AFETO</td>
                            <td className="py-2 px-3 text-right">{it.quantity}</td>
                            <td className="py-2 px-3 text-right font-bold">R$ {it.totalPrice.toFixed(2)}</td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Totals Summary */}
              <div className="pt-2 border-t border-stone-200 space-y-1 text-right">
                <div className="text-stone-500">
                  Subtotal: <strong>R$ {(receiptModalOrder.subtotal || receiptModalOrder.totalAmount).toFixed(2)}</strong>
                </div>
                {receiptModalOrder.deliveryFee > 0 && (
                  <div className="text-stone-500">
                    Taxa Entrega: <strong>R$ {receiptModalOrder.deliveryFee.toFixed(2)}</strong>
                  </div>
                )}
                <div className="text-base font-bold text-stone-900 pt-1">
                  TOTAL: R$ {receiptModalOrder.totalAmount.toFixed(2)}
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="pt-4 flex items-center justify-end space-x-2">
              <button
                onClick={() => setReceiptModalOrder(null)}
                className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl font-semibold text-xs"
              >
                Fechar
              </button>

              <button
                onClick={() => downloadReceiptPDF(receiptModalOrder)}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-semibold text-xs flex items-center space-x-1.5 shadow-xs"
              >
                <Printer className="w-4 h-4" />
                <span>Baixar Comprovante em PDF</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
