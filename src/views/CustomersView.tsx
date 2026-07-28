import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  Users,
  Plus,
  Search,
  UserCheck,
  Phone,
  MapPin,
  Mail,
  Calendar,
  MessageSquare,
  ShoppingBag,
  ExternalLink,
  Edit2,
  Trash2,
  X,
  Check,
  Copy,
  Clock,
  Cake,
  DollarSign,
  Heart
} from 'lucide-react';
import { db } from '../db';
import { Client, Venda, ItemVenda } from '../types';
import { ClientsMap, geocodeClientAddress } from '../components/customers/ClientsMap';

export const CustomersView: React.FC = () => {
  const [activeViewTab, setActiveViewTab] = useState<'lista' | 'mapa'>('lista');
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [clientToDelete, setClientToDelete] = useState<Client | null>(null);

  // Modals for History and WhatsApp Message
  const [selectedClientHistory, setSelectedClientHistory] = useState<Client | null>(null);
  const [selectedClientForMsg, setSelectedClientForMsg] = useState<Client | null>(null);
  const [selectedOrderForMsg, setSelectedOrderForMsg] = useState<Venda | null>(null);
  const [copiedMsg, setCopiedMsg] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    whatsapp: '',
    email: '',
    address: '',
    neighborhood: '',
    city: 'Manaus',
    birthDate: '',
    observations: ''
  });

  // Dexie Queries
  const clients = useLiveQuery(() => db.clientes.toArray(), []) || [];
  const orders = useLiveQuery(() => db.vendas.toArray(), []) || [];
  const orderItems = useLiveQuery(() => db.itensVenda.toArray(), []) || [];

  // Filter clients
  const filteredClients = clients.filter((c) => {
    const term = searchTerm.toLowerCase();
    return (
      c.name.toLowerCase().includes(term) ||
      c.phone.includes(term) ||
      (c.whatsapp && c.whatsapp.includes(term)) ||
      (c.email && c.email.toLowerCase().includes(term)) ||
      c.address.toLowerCase().includes(term)
    );
  });

  const handleOpenAdd = () => {
    setEditingClient(null);
    setFormError(null);
    setFormData({
      name: '',
      phone: '',
      whatsapp: '',
      email: '',
      address: '',
      neighborhood: '',
      city: 'Manaus',
      birthDate: '',
      observations: ''
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (client: Client) => {
    setEditingClient(client);
    setFormError(null);
    setFormData({
      name: client.name || '',
      phone: client.phone || '',
      whatsapp: client.whatsapp || client.phone || '',
      email: client.email || '',
      address: client.address || '',
      neighborhood: client.neighborhood || '',
      city: client.city || 'Manaus',
      birthDate: client.birthDate || '',
      observations: client.observations || ''
    });
    setIsModalOpen(true);
  };

  const handleSaveClient = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const name = formData.name.trim();
    const rawPhone = formData.phone.trim();
    const rawWhatsapp = (formData.whatsapp || formData.phone).trim();
    const email = formData.email.trim();

    if (!name) {
      setFormError('Nome do cliente é obrigatório.');
      return;
    }

    const cleanPhone = rawPhone.replace(/\D/g, '');
    if (!cleanPhone || cleanPhone.length < 8) {
      setFormError('Por favor, informe um número de telefone válido (mínimo 8 dígitos).');
      return;
    }

    if (email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        setFormError('O e-mail informado tem um formato inválido.');
        return;
      }
    }

    // Check for duplicates (phone or email)
    const existingClients = await db.clientes.toArray();
    const duplicatePhone = existingClients.find(
      (c) => c.phone.replace(/\D/g, '') === cleanPhone && c.id !== editingClient?.id
    );
    if (duplicatePhone) {
      setFormError(`O telefone "${rawPhone}" já está cadastrado para o cliente "${duplicatePhone.name}".`);
      return;
    }

    if (email) {
      const duplicateEmail = existingClients.find(
        (c) => c.email?.toLowerCase() === email.toLowerCase() && c.id !== editingClient?.id
      );
      if (duplicateEmail) {
        setFormError(`O e-mail "${email}" já está cadastrado para o cliente "${duplicateEmail.name}".`);
        return;
      }
    }

    const cleanWhatsapp = rawWhatsapp.replace(/\D/g, '');

    const addressTrimmed = formData.address.trim();
    const neighborhoodTrimmed = formData.neighborhood.trim() || undefined;
    const cityTrimmed = formData.city.trim() || 'Manaus';

    let coords = editingClient?.latitude && editingClient?.longitude
      ? { lat: editingClient.latitude, lng: editingClient.longitude }
      : null;

    if (addressTrimmed && (!editingClient || editingClient.address !== addressTrimmed)) {
      coords = await geocodeClientAddress(addressTrimmed, neighborhoodTrimmed, cityTrimmed);
    }

    const clientPayload: Client = {
      id: editingClient ? editingClient.id : `cli_${Date.now()}`,
      name,
      phone: rawPhone,
      whatsapp: cleanWhatsapp ? cleanWhatsapp : cleanPhone,
      email: email || undefined,
      address: addressTrimmed,
      neighborhood: neighborhoodTrimmed,
      city: cityTrimmed,
      birthDate: formData.birthDate || undefined,
      observations: formData.observations.trim() || undefined,
      latitude: coords?.lat,
      longitude: coords?.lng,
      createdAt: editingClient ? editingClient.createdAt : new Date().toISOString()
    };

    await db.clientes.put(clientPayload);
    await db.clients.put(clientPayload);

    setIsModalOpen(false);
  };

  const handleDeleteClient = (client: Client, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setClientToDelete(client);
  };

  const confirmDeleteClient = async () => {
    if (!clientToDelete) return;
    try {
      await db.clientes.delete(clientToDelete.id);
      await db.clients.delete(clientToDelete.id);
      setClientToDelete(null);
    } catch (err) {
      console.error('Erro ao excluir cliente:', err);
    }
  };

  // Format Whatsapp Link
  const getWhatsappLink = (phoneOrWa: string, customText?: string) => {
    const clean = phoneOrWa.replace(/\D/g, '');
    let formatted = clean;
    if (!formatted.startsWith('55') && (formatted.length === 10 || formatted.length === 11)) {
      formatted = `55${formatted}`;
    }
    const baseUrl = `https://wa.me/${formatted}`;
    if (customText) {
      return `${baseUrl}?text=${encodeURIComponent(customText)}`;
    }
    return baseUrl;
  };

  // Helper to format date
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    try {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
      }
      return new Date(dateStr).toLocaleDateString('pt-BR');
    } catch {
      return dateStr;
    }
  };

  // Generate Ready Message for Order
  const generateOrderSummaryMsg = (client: Client, order: Venda) => {
    const itemsForOrder = orderItems.filter(
      (item) => item.vendaId === order.id || item.orderId === order.id
    );

    const itemsSummary = itemsForOrder.length > 0
      ? itemsForOrder.map(i => `  • ${i.quantity}x (R$ ${i.unitPrice.toFixed(2)})`).join('\n')
      : '  • Pedido de Cesta AFETO Customizada';

    return `🌸 *AFETO CESTAS & PRESENTES* 🌸\n` +
      `Olá *${client.name}*! Segue o resumo do seu pedido *#${order.orderNumber}*:\n\n` +
      `📅 *Data de Entrega:* ${formatDate(order.deliveryDate)} (${order.deliveryPeriod || 'Horário Comercial'})\n` +
      `📍 *Endereço:* ${order.deliveryAddress || client.address}\n` +
      `👤 *Destinatário:* ${order.recipientName}\n` +
      (order.cardMessage ? `💌 *Mensagem do Cartão:* "${order.cardMessage}"\n` : '') +
      `\n🛍️ *Resumo dos Itens:*\n${itemsSummary}\n\n` +
      `💰 *Total:* R$ ${order.totalAmount.toFixed(2)}\n` +
      `💳 *Pagamento:* ${order.paymentMethod.toUpperCase()} (${order.paymentStatus === 'pago' ? 'PAGO ✅' : 'PENDENTE ⏳'})\n\n` +
      `Qualquer dúvida estamos à disposição. Muito obrigado por escolher a AFETO! ❤️`;
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-stone-200/80 shadow-xs">
        <div>
          <div className="flex items-center space-x-2 text-rose-600 mb-1">
            <Users className="w-5 h-5" />
            <span className="text-xs font-bold uppercase tracking-wider">Base de Clientes</span>
          </div>
          <h1 className="text-2xl font-bold text-stone-900">Cadastro de Clientes</h1>
          <p className="text-xs text-stone-500 mt-0.5">
            Registro completo de compradores, datas de nascimento, histórico de pedidos e mensagens para WhatsApp.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          {/* View Mode Toggle */}
          <div className="flex bg-stone-100 p-1 rounded-xl border border-stone-200 text-xs font-bold">
            <button
              onClick={() => setActiveViewTab('lista')}
              className={`px-3 py-1.5 rounded-lg flex items-center space-x-1.5 transition-all ${
                activeViewTab === 'lista'
                  ? 'bg-white text-rose-600 shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Lista</span>
            </button>
            <button
              onClick={() => setActiveViewTab('mapa')}
              className={`px-3 py-1.5 rounded-lg flex items-center space-x-1.5 transition-all ${
                activeViewTab === 'mapa'
                  ? 'bg-white text-rose-600 shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <MapPin className="w-3.5 h-3.5" />
              <span>Mapa dos Clientes</span>
            </button>
          </div>

          <button
            onClick={handleOpenAdd}
            className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-xl text-xs transition-all shadow-sm flex items-center justify-center space-x-1.5 active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Novo Cliente</span>
          </button>
        </div>
      </div>

      {/* Map View */}
      {activeViewTab === 'mapa' && (
        <ClientsMap
          clients={clients}
          orders={orders}
          onSelectClient={(client) => handleOpenEdit(client)}
        />
      )}

      {/* Search & Statistics Bar */}
      {activeViewTab === 'lista' && (
        <>
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por nome, telefone, email ou endereço..."
                className="w-full pl-9 pr-4 py-2 bg-white border border-stone-200 rounded-xl text-xs focus:outline-none focus:border-rose-500 shadow-xs"
              />
            </div>

            <div className="flex items-center space-x-4 text-xs text-stone-500 self-end sm:self-auto">
              <span className="bg-white px-3 py-1.5 rounded-xl border border-stone-200/80 shadow-xs font-medium">
                Total: <strong className="text-stone-900">{clients.length}</strong> clientes
              </span>
            </div>
          </div>

      {/* Customers List / Grid */}
      {filteredClients.length === 0 ? (
        <div className="bg-white border border-stone-200/80 rounded-2xl p-12 text-center shadow-xs flex flex-col items-center justify-center">
          <div className="w-16 h-16 rounded-2xl bg-rose-50 text-rose-500 flex items-center justify-center mb-3">
            <UserCheck className="w-8 h-8" />
          </div>
          <h3 className="text-base font-bold text-stone-800">
            {searchTerm ? 'Nenhum cliente encontrado' : 'Nenhum cliente cadastrado'}
          </h3>
          <p className="text-xs text-stone-400 max-w-sm mt-1 mb-4">
            {searchTerm
              ? 'Tente buscar por outro termo ou limpe a pesquisa.'
              : 'Cadastre compradores para salvar preferências de presentes e enviar mensagens prontas via WhatsApp.'}
          </p>
          <button
            onClick={handleOpenAdd}
            className="px-4 py-2 bg-stone-900 text-white rounded-xl text-xs font-semibold hover:bg-stone-800 transition-colors inline-flex items-center space-x-1.5"
          >
            <Plus className="w-4 h-4 text-rose-400" />
            <span>Cadastrar Primeiro Cliente</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredClients.map((client) => {
            const clientOrders = orders.filter((o) => o.clientId === client.id);
            const totalSpent = clientOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
            const latestOrder = clientOrders.length > 0 ? clientOrders[clientOrders.length - 1] : null;

            return (
              <div
                key={client.id}
                className="bg-white border border-stone-200/80 rounded-2xl p-5 shadow-xs hover:border-rose-300 transition-all flex flex-col justify-between"
              >
                <div>
                  {/* Top Card Bar */}
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex items-center space-x-3">
                      <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-rose-500 to-rose-600 text-white font-bold flex items-center justify-center shadow-xs text-base shrink-0">
                        {client.name.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="font-bold text-stone-900 text-sm line-clamp-1">{client.name}</h3>
                        <p className="text-xs text-stone-500 flex items-center space-x-1 mt-0.5">
                          <Phone className="w-3 h-3 text-rose-500" />
                          <span>{client.phone}</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-1">
                      <button
                        onClick={() => handleOpenEdit(client)}
                        className="p-1.5 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-lg transition-colors"
                        title="Editar Cliente"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={(e) => handleDeleteClient(client, e)}
                        className="p-1.5 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        title="Excluir Cliente"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Customer Info Pills */}
                  <div className="space-y-2 text-xs text-stone-600 pt-2 border-t border-stone-100 mb-4">
                    {client.whatsapp && (
                      <div className="flex items-center justify-between">
                        <span className="text-stone-400 text-[11px]">WhatsApp:</span>
                        <a
                          href={getWhatsappLink(client.whatsapp)}
                          target="_blank"
                          rel="noreferrer"
                          className="font-medium text-emerald-700 hover:underline flex items-center space-x-1"
                        >
                          <MessageSquare className="w-3 h-3 text-emerald-600" />
                          <span>{client.whatsapp}</span>
                        </a>
                      </div>
                    )}

                    {client.email && (
                      <div className="flex items-center justify-between">
                        <span className="text-stone-400 text-[11px]">Email:</span>
                        <span className="font-medium truncate max-w-[170px]">{client.email}</span>
                      </div>
                    )}

                    {client.birthDate && (
                      <div className="flex items-center justify-between">
                        <span className="text-stone-400 text-[11px] flex items-center space-x-1">
                          <Cake className="w-3 h-3 text-rose-400" />
                          <span>Nascimento:</span>
                        </span>
                        <span className="font-medium bg-rose-50 text-rose-700 px-2 py-0.5 rounded-md text-[11px]">
                          {formatDate(client.birthDate)}
                        </span>
                      </div>
                    )}

                    <div className="flex items-start justify-between">
                      <span className="text-stone-400 text-[11px] shrink-0 mr-2">Endereço:</span>
                      <span className="font-medium text-stone-700 text-right line-clamp-2">
                        {client.address}
                        {client.neighborhood ? `, ${client.neighborhood}` : ''}
                      </span>
                    </div>

                    {client.observations && (
                      <div className="p-2 bg-stone-50 rounded-xl text-[11px] text-stone-500 italic mt-1">
                        "{client.observations}"
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer Metrics & Actions */}
                <div>
                  <div className="bg-stone-50 p-2.5 rounded-xl flex items-center justify-between mb-3 text-xs">
                    <div>
                      <span className="text-[10px] text-stone-400 uppercase font-semibold block">Compras</span>
                      <span className="font-bold text-stone-800">{clientOrders.length} pedido(s)</span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-stone-400 uppercase font-semibold block">Total Gasto</span>
                      <span className="font-bold text-emerald-700">R$ {totalSpent.toFixed(2)}</span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="grid grid-cols-2 gap-2">
                    {/* WhatsApp Direct Button */}
                    <a
                      href={getWhatsappLink(client.whatsapp || client.phone)}
                      target="_blank"
                      rel="noreferrer"
                      className="px-2.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold flex items-center justify-center space-x-1.5 transition-colors shadow-xs"
                    >
                      <MessageSquare className="w-3.5 h-3.5 fill-white/20" />
                      <span>WhatsApp</span>
                    </a>

                    {/* History Modal Trigger */}
                    <button
                      onClick={() => setSelectedClientHistory(client)}
                      className="px-2.5 py-2 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-xl text-xs font-semibold flex items-center justify-center space-x-1.5 transition-colors"
                    >
                      <ShoppingBag className="w-3.5 h-3.5 text-stone-600" />
                      <span>Histórico</span>
                    </button>
                  </div>

                  {/* WhatsApp Order Summary Button */}
                  {latestOrder && (
                    <button
                      onClick={() => {
                        setSelectedClientForMsg(client);
                        setSelectedOrderForMsg(latestOrder);
                      }}
                      className="w-full mt-2 py-1.5 px-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200/80 rounded-xl text-[11px] font-semibold flex items-center justify-center space-x-1 transition-colors"
                    >
                      <Heart className="w-3 h-3 text-rose-500 fill-rose-500/20" />
                      <span>Resumo da Compra no WhatsApp</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
      </>
      )}

      {/* Modal: Cadastrar / Editar Cliente */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-stone-200 overflow-y-auto max-h-[90vh]">
            <div className="flex items-center justify-between pb-4 border-b border-stone-100 mb-4">
              <div>
                <h3 className="text-lg font-bold text-stone-900">
                  {editingClient ? 'Editar Cliente' : 'Novo Cliente'}
                </h3>
                <p className="text-xs text-stone-500">Informe os dados de contato e endereço principal.</p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-stone-400 hover:text-stone-700 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveClient} className="space-y-4 text-xs">
              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl font-medium text-xs">
                  {formError}
                </div>
              )}
              <div>
                <label className="block font-semibold text-stone-700 mb-1">Nome Completo *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: Ana Maria Silva"
                  className="w-full px-3 py-2 border border-stone-200 rounded-xl focus:outline-none focus:border-rose-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">Telefone Principal *</label>
                  <input
                    type="text"
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="(92) 99123-4567"
                    className="w-full px-3 py-2 border border-stone-200 rounded-xl focus:outline-none focus:border-rose-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-stone-700 mb-1">WhatsApp (se diferente)</label>
                  <input
                    type="text"
                    value={formData.whatsapp}
                    onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                    placeholder="(92) 99123-4567"
                    className="w-full px-3 py-2 border border-stone-200 rounded-xl focus:outline-none focus:border-rose-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="ana.maria@email.com"
                    className="w-full px-3 py-2 border border-stone-200 rounded-xl focus:outline-none focus:border-rose-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-stone-700 mb-1">Data de Nascimento</label>
                  <input
                    type="date"
                    value={formData.birthDate}
                    onChange={(e) => setFormData({ ...formData, birthDate: e.target.value })}
                    className="w-full px-3 py-2 border border-stone-200 rounded-xl focus:outline-none focus:border-rose-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1">Endereço de Entrega Frequente *</label>
                <input
                  type="text"
                  required
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Rua, número, complemento"
                  className="w-full px-3 py-2 border border-stone-200 rounded-xl focus:outline-none focus:border-rose-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">Bairro</label>
                  <input
                    type="text"
                    value={formData.neighborhood}
                    onChange={(e) => setFormData({ ...formData, neighborhood: e.target.value })}
                    placeholder="Ex: Adrianópolis"
                    className="w-full px-3 py-2 border border-stone-200 rounded-xl focus:outline-none focus:border-rose-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-stone-700 mb-1">Cidade / UF</label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    placeholder="Manaus / AM"
                    className="w-full px-3 py-2 border border-stone-200 rounded-xl focus:outline-none focus:border-rose-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1">Observações / Preferências</label>
                <textarea
                  rows={2}
                  value={formData.observations}
                  onChange={(e) => setFormData({ ...formData, observations: e.target.value })}
                  placeholder="Ex: Prefere frutas frescas, alérgica a amendoim, entrega no condomínio..."
                  className="w-full px-3 py-2 border border-stone-200 rounded-xl focus:outline-none focus:border-rose-500 resize-none"
                />
              </div>

              <div className="pt-4 border-t border-stone-100 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-semibold shadow-xs"
                >
                  Salvar Cliente
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Histórico de Compras do Cliente */}
      {selectedClientHistory && (
        <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-stone-200 overflow-y-auto max-h-[90vh]">
            <div className="flex items-center justify-between pb-4 border-b border-stone-100 mb-4">
              <div>
                <span className="text-xs font-bold text-rose-600 uppercase tracking-wider">Histórico de Pedidos</span>
                <h3 className="text-lg font-bold text-stone-900">{selectedClientHistory.name}</h3>
              </div>
              <button
                onClick={() => setSelectedClientHistory(null)}
                className="p-1.5 text-stone-400 hover:text-stone-700 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {(() => {
              const clientOrders = orders.filter((o) => o.clientId === selectedClientHistory.id);

              if (clientOrders.length === 0) {
                return (
                  <div className="p-8 text-center text-stone-400 text-xs">
                    <ShoppingBag className="w-10 h-10 mx-auto text-stone-300 mb-2" />
                    Este cliente ainda não realizou compras no sistema AFETO.
                  </div>
                );
              }

              return (
                <div className="space-y-4 text-xs">
                  {clientOrders.map((order) => {
                    const items = orderItems.filter(
                      (i) => i.vendaId === order.id || i.orderId === order.id
                    );

                    return (
                      <div
                        key={order.id}
                        className="bg-stone-50 border border-stone-200/80 rounded-2xl p-4 space-y-3"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-200/60 pb-2">
                          <div className="flex items-center space-x-2">
                            <span className="font-bold text-stone-900 text-sm">#{order.orderNumber}</span>
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                order.status === 'entregue'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : order.status === 'cancelado'
                                  ? 'bg-rose-100 text-rose-800'
                                  : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {order.status.toUpperCase()}
                            </span>
                          </div>

                          <div className="flex items-center space-x-3 text-stone-500">
                            <span className="flex items-center space-x-1">
                              <Calendar className="w-3.5 h-3.5 text-stone-400" />
                              <span>{formatDate(order.deliveryDate)}</span>
                            </span>
                            <span className="font-bold text-stone-900">
                              R$ {order.totalAmount.toFixed(2)}
                            </span>
                          </div>
                        </div>

                        {/* Recipient & Address */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-stone-600">
                          <div>
                            <strong className="text-stone-800">Destinatário:</strong> {order.recipientName}
                          </div>
                          <div>
                            <strong className="text-stone-800">Pagamento:</strong> {order.paymentMethod} (
                            <span className={order.paymentStatus === 'pago' ? 'text-emerald-600 font-bold' : 'text-amber-600 font-bold'}>
                              {order.paymentStatus}
                            </span>
                            )
                          </div>
                        </div>

                        {/* Items list */}
                        {items.length > 0 && (
                          <div className="bg-white p-2.5 rounded-xl border border-stone-200/60">
                            <span className="text-[10px] text-stone-400 font-bold uppercase block mb-1">Itens do Pedido:</span>
                            <ul className="space-y-1">
                              {items.map((it) => (
                                <li key={it.id} className="flex justify-between text-stone-700 text-[11px]">
                                  <span>{it.quantity}x Item</span>
                                  <span className="font-medium">R$ {it.totalPrice.toFixed(2)}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Action: Send Whatsapp Summary */}
                        <div className="flex justify-end pt-1">
                          <button
                            onClick={() => {
                              setSelectedClientHistory(null);
                              setSelectedClientForMsg(selectedClientHistory);
                              setSelectedOrderForMsg(order);
                            }}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold flex items-center space-x-1 text-[11px] transition-colors"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                            <span>Gerar Resumo no WhatsApp</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* Modal: Mensagem Pronta com Resumo da Compra */}
      {selectedClientForMsg && selectedOrderForMsg && (
        <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-stone-200">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100 mb-3">
              <div>
                <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider">Mensagem WhatsApp</span>
                <h3 className="text-base font-bold text-stone-900">
                  Resumo do Pedido #{selectedOrderForMsg.orderNumber}
                </h3>
              </div>
              <button
                onClick={() => {
                  setSelectedClientForMsg(null);
                  setSelectedOrderForMsg(null);
                }}
                className="p-1.5 text-stone-400 hover:text-stone-700 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-stone-500 mb-3">
              Confira abaixo o texto pré-formatado para envio direto ao cliente no WhatsApp:
            </p>

            {/* Generated Text Box */}
            <div className="p-4 bg-emerald-50/60 border border-emerald-200/80 rounded-2xl text-xs font-mono text-stone-800 whitespace-pre-wrap leading-relaxed max-h-60 overflow-y-auto mb-4">
              {generateOrderSummaryMsg(selectedClientForMsg, selectedOrderForMsg)}
            </div>

            <div className="flex items-center justify-between gap-2">
              <button
                onClick={() => {
                  const text = generateOrderSummaryMsg(selectedClientForMsg, selectedOrderForMsg);
                  navigator.clipboard.writeText(text);
                  setCopiedMsg(true);
                  setTimeout(() => setCopiedMsg(false), 2000);
                }}
                className="px-3.5 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-colors"
              >
                {copiedMsg ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-600" />
                    <span className="text-emerald-700 font-bold">Copiado!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 text-stone-600" />
                    <span>Copiar Texto</span>
                  </>
                )}
              </button>

              <a
                href={getWhatsappLink(
                  selectedClientForMsg.whatsapp || selectedClientForMsg.phone,
                  generateOrderSummaryMsg(selectedClientForMsg, selectedOrderForMsg)
                )}
                target="_blank"
                rel="noreferrer"
                className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-colors shadow-xs"
              >
                <MessageSquare className="w-4 h-4" />
                <span>Abrir e Enviar no WhatsApp</span>
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Confirmar Exclusão de Cliente */}
      {clientToDelete && (
        <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-stone-200">
            <div className="flex items-center space-x-3 text-rose-600 mb-3">
              <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center text-rose-600">
                <Trash2 className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-stone-900">Excluir Cliente</h3>
            </div>

            <p className="text-xs text-stone-600 leading-relaxed mb-4">
              Tem certeza que deseja remover o cliente <strong className="text-stone-900">{clientToDelete.name}</strong> do cadastro? Esta ação removerá os dados de contato do cliente.
            </p>

            <div className="flex items-center justify-end space-x-2 pt-3 border-t border-stone-100">
              <button
                type="button"
                onClick={() => setClientToDelete(null)}
                className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-semibold"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmDeleteClient}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold shadow-xs"
              >
                Sim, Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
