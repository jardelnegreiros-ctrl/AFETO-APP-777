import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  Package,
  Plus,
  Search,
  Tag,
  Barcode,
  Camera,
  Filter,
  AlertTriangle,
  Calendar,
  Building2,
  Edit2,
  Trash2,
  Copy,
  DollarSign,
  TrendingUp,
  LayoutGrid,
  List,
  Sparkles,
  Layers,
  ChevronDown,
  X,
  CheckCircle2,
  RefreshCw,
  Eye,
  History,
  AlertOctagon,
  ArrowUpDown
} from 'lucide-react';
import { db } from '../db';
import { Product, Category, Supplier } from '../types';
import { ProductFormModal } from '../components/products/ProductFormModal';
import { BarcodeScannerModal } from '../components/products/BarcodeScannerModal';
import { StockMovementModal } from '../components/products/StockMovementModal';

export const ProductsView: React.FC = () => {
  // Live Reactive Data from Dexie DB
  const productsList = useLiveQuery(() => db.produtos.toArray(), []) || [];
  const categoriesList = useLiveQuery(() => db.categorias.toArray(), []) || [];
  const suppliersList = useLiveQuery(() => db.suppliers.toArray(), []) || [];

  // Filtering, Alert & Search state
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('todas');
  const [alertFilter, setAlertFilter] = useState<'todos' | 'vencidos' | 'vencer_7d' | 'vencer_30d' | 'estoque_baixo' | 'sem_estoque'>('todos');
  const [stockFilter, setStockFilter] = useState<'todos' | 'normal' | 'baixo' | 'esgotado'>('todos');
  const [expiryFilter, setExpiryFilter] = useState<'todos' | 'proximo' | 'vencido'>('todos');
  const [supplierFilter, setSupplierFilter] = useState<string>('todos');
  const [sortBy, setSortBy] = useState<'nome' | 'menor_estoque' | 'validade_proxima' | 'maior_preco'>('nome');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  // Modals
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [productToEdit, setProductToEdit] = useState<Product | null>(null);
  const [isSearchBarcodeScannerOpen, setIsSearchBarcodeScannerOpen] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [stockModalProduct, setStockModalProduct] = useState<Product | null>(null);
  const [isStockModalOpen, setIsStockModalOpen] = useState(false);

  // Helper date logic
  const getDaysUntilExpiry = (expiryDate?: string) => {
    if (!expiryDate) return 9999;
    const exp = new Date(expiryDate);
    const now = new Date();
    // Normalize to midnight
    exp.setHours(0, 0, 0, 0);
    now.setHours(0, 0, 0, 0);
    return Math.ceil((exp.getTime() - now.getTime()) / (1000 * 3600 * 24));
  };

  const getExpiryStatus = (expiryDate?: string) => {
    if (!expiryDate) return 'none';
    const days = getDaysUntilExpiry(expiryDate);
    if (days < 0) return 'vencido';
    if (days <= 15) return 'proximo';
    return 'ok';
  };

  // Metric Counters
  const expiredCount = productsList.filter((p) => getDaysUntilExpiry(p.expiryDate) < 0).length;
  const expireIn30dCount = productsList.filter((p) => {
    const d = getDaysUntilExpiry(p.expiryDate);
    return d >= 0 && d <= 30;
  }).length;
  const lowStockCount = productsList.filter((p) => p.stockQuantity > 0 && p.stockQuantity <= 2).length;
  const emptyStockCount = productsList.filter((p) => p.stockQuantity <= 0).length;
  const totalStockValue = productsList.reduce((acc, p) => acc + p.stockQuantity * p.costPrice, 0);

  // Filtered Products
  const filteredProducts = productsList.filter((product) => {
    // 1. Search Term
    const term = searchTerm.toLowerCase().trim();
    const matchesSearch =
      !term ||
      product.name.toLowerCase().includes(term) ||
      (product.barcode && product.barcode.toLowerCase().includes(term)) ||
      product.code.toLowerCase().includes(term) ||
      (product.supplierName && product.supplierName.toLowerCase().includes(term)) ||
      (product.categoryTags && product.categoryTags.some((t) => t.toLowerCase().includes(term)));

    // 2. Category Filter
    const matchesCategory =
      selectedCategory === 'todas' || product.categoryId === selectedCategory;

    // 3. Supplier Filter
    const matchesSupplier =
      supplierFilter === 'todos' || product.supplierId === supplierFilter;

    // 4. Alert Filter
    let matchesAlert = true;
    const daysToExpire = getDaysUntilExpiry(product.expiryDate);

    if (alertFilter === 'vencidos') {
      matchesAlert = daysToExpire < 0;
    } else if (alertFilter === 'vencer_7d') {
      matchesAlert = daysToExpire >= 0 && daysToExpire <= 7;
    } else if (alertFilter === 'vencer_30d') {
      matchesAlert = daysToExpire >= 0 && daysToExpire <= 30;
    } else if (alertFilter === 'estoque_baixo') {
      matchesAlert = product.stockQuantity > 0 && product.stockQuantity <= 2;
    } else if (alertFilter === 'sem_estoque') {
      matchesAlert = product.stockQuantity <= 0;
    }

    // 5. Stock Filter
    let matchesStock = true;
    if (stockFilter === 'baixo') matchesStock = product.stockQuantity > 0 && product.stockQuantity <= product.minStock;
    else if (stockFilter === 'esgotado') matchesStock = product.stockQuantity <= 0;
    else if (stockFilter === 'normal') matchesStock = product.stockQuantity > product.minStock;

    // 6. Expiry Filter
    let matchesExpiry = true;
    const expStatus = getExpiryStatus(product.expiryDate);
    if (expiryFilter === 'vencido') matchesExpiry = expStatus === 'vencido';
    else if (expiryFilter === 'proximo') matchesExpiry = expStatus === 'proximo';

    return matchesSearch && matchesCategory && matchesSupplier && matchesAlert && matchesStock && matchesExpiry;
  });

  // Sorting
  filteredProducts.sort((a, b) => {
    if (sortBy === 'menor_estoque') {
      return a.stockQuantity - b.stockQuantity;
    }
    if (sortBy === 'validade_proxima') {
      return getDaysUntilExpiry(a.expiryDate) - getDaysUntilExpiry(b.expiryDate);
    }
    if (sortBy === 'maior_preco') {
      return b.salePrice - a.salePrice;
    }
    return a.name.localeCompare(b.name);
  });

  // CRUD Handlers
  const handleOpenNewProduct = () => {
    setProductToEdit(null);
    setIsFormOpen(true);
  };

  const handleOpenEditProduct = (product: Product) => {
    setProductToEdit(product);
    setIsFormOpen(true);
  };

  const handleDuplicateProduct = async (product: Product) => {
    const duplicated: Product = {
      ...product,
      id: `prod_${Date.now()}`,
      code: `PRD-${Math.floor(100 + Math.random() * 900)}`,
      name: `${product.name} (Cópia)`,
      barcode: product.barcode ? `${product.barcode}-COP` : ''
    };
    await db.produtos.put(duplicated);
    await db.products.put(duplicated);
  };

  const handleSaveProduct = async (productData: Partial<Product>) => {
    const idToSave = productData.id || `prod_${Date.now()}`;
    const fullProduct: Product = {
      id: idToSave,
      code: productData.code || `PRD-${Math.floor(100 + Math.random() * 900)}`,
      name: productData.name || 'Sem nome',
      categoryId: productData.categoryId || 'cat_04',
      unit: productData.unit || 'unidade',
      costPrice: productData.costPrice || 0,
      salePrice: productData.salePrice || 0,
      stockQuantity: productData.stockQuantity ?? 0,
      minStock: productData.minStock ?? 5,
      barcode: productData.barcode || '',
      categoryTags: productData.categoryTags || [],
      expiryDate: productData.expiryDate || '',
      supplierId: productData.supplierId || '',
      supplierName: productData.supplierName || '',
      imageUrl: productData.imageUrl || ''
    };

    await db.produtos.put(fullProduct);
    await db.products.put(fullProduct);
  };

  const handleDeleteProduct = async (id: string) => {
    await db.produtos.delete(id);
    await db.products.delete(id);
    setDeleteConfirmId(null);
  };

  const handleQuickStockAdjust = async (product: Product, delta: number) => {
    const newQty = Math.max(0, product.stockQuantity + delta);
    const updated = { ...product, stockQuantity: newQty };
    await db.produtos.put(updated);
    await db.products.put(updated);
  };

  return (
    <div className="space-y-6">
      {/* Top Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-stone-200/80 shadow-xs">
        <div>
          <div className="flex items-center space-x-2 text-rose-600 mb-1">
            <Package className="w-5 h-5" />
            <span className="text-xs font-bold uppercase tracking-wider">Gestão do Catálogo</span>
          </div>
          <h1 className="text-2xl font-black text-stone-900 tracking-tight">Módulo de Produtos</h1>
          <p className="text-xs text-stone-500 mt-1">
            Cadastre insumos, tags, fornecedores, código de barras e acompanhe validades e estoque em tempo real.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => {
              setStockModalProduct(null);
              setIsStockModalOpen(true);
            }}
            className="px-4 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-800 font-semibold rounded-2xl text-xs transition-all flex items-center space-x-2 border border-stone-200"
            title="Histórico de movimentações do estoque"
          >
            <History className="w-4 h-4 text-rose-600" />
            <span>Histórico / Lançamentos</span>
          </button>

          <button
            onClick={() => setIsSearchBarcodeScannerOpen(true)}
            className="px-4 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-800 font-semibold rounded-2xl text-xs transition-all flex items-center space-x-2 border border-stone-200"
            title="Escanear produto pela câmera"
          >
            <Camera className="w-4 h-4 text-rose-600" />
            <span>Leitor Câmera</span>
          </button>

          <button
            onClick={handleOpenNewProduct}
            className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-2xl text-xs transition-all shadow-md flex items-center space-x-2 active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Novo Produto</span>
          </button>
        </div>
      </div>

      {/* Metric Cards Row */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-stone-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase text-stone-400 tracking-wider block">Produtos Vencidos</span>
            <div className={`text-2xl font-black mt-0.5 ${expiredCount > 0 ? 'text-rose-600' : 'text-stone-900'}`}>
              {expiredCount}
            </div>
            <span className="text-[10px] text-stone-400">Descarte / Perda</span>
          </div>
          <div className={`p-3 rounded-2xl ${expiredCount > 0 ? 'bg-rose-100 text-rose-600' : 'bg-stone-100 text-stone-400'}`}>
            <AlertOctagon className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-stone-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase text-stone-400 tracking-wider block">Vencem em 30 Dias</span>
            <div className={`text-2xl font-black mt-0.5 ${expireIn30dCount > 0 ? 'text-amber-600' : 'text-stone-900'}`}>
              {expireIn30dCount}
            </div>
            <span className="text-[10px] text-stone-400">Atenção no uso</span>
          </div>
          <div className={`p-3 rounded-2xl ${expireIn30dCount > 0 ? 'bg-amber-100 text-amber-600' : 'bg-stone-100 text-stone-400'}`}>
            <Calendar className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-stone-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase text-stone-400 tracking-wider block">Estoque Baixo (≤2)</span>
            <div className={`text-2xl font-black mt-0.5 ${lowStockCount > 0 ? 'text-amber-600' : 'text-stone-900'}`}>
              {lowStockCount}
            </div>
            <span className="text-[10px] text-stone-400">Necessita compra</span>
          </div>
          <div className={`p-3 rounded-2xl ${lowStockCount > 0 ? 'bg-amber-100 text-amber-600' : 'bg-stone-100 text-stone-400'}`}>
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-stone-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase text-stone-400 tracking-wider block">Sem Estoque (0)</span>
            <div className={`text-2xl font-black mt-0.5 ${emptyStockCount > 0 ? 'text-rose-600' : 'text-stone-900'}`}>
              {emptyStockCount}
            </div>
            <span className="text-[10px] text-stone-400">Esgotado</span>
          </div>
          <div className={`p-3 rounded-2xl ${emptyStockCount > 0 ? 'bg-rose-100 text-rose-600' : 'bg-stone-100 text-stone-400'}`}>
            <Package className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Search and Filters Bar */}
      <div className="bg-white p-4 rounded-3xl border border-stone-200/80 shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-3">
          {/* Main Search Input with Camera Barcode Trigger */}
          <div className="relative w-full lg:w-80 flex items-center">
            <Search className="w-4 h-4 absolute left-3.5 text-stone-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por nome, código, tag..."
              className="w-full pl-10 pr-10 py-2.5 bg-stone-50 border border-stone-200 rounded-2xl text-xs font-medium focus:outline-none focus:border-rose-500 focus:bg-white transition-all"
            />
            {searchTerm ? (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 text-stone-400 hover:text-stone-700"
              >
                <X className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={() => setIsSearchBarcodeScannerOpen(true)}
                title="Escanear com a câmera para buscar"
                className="absolute right-3 text-stone-400 hover:text-rose-600 transition-colors"
              >
                <Barcode className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Filter Selects Row */}
          <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto text-xs">
            {/* Filter by Alert */}
            <select
              value={alertFilter}
              onChange={(e) => setAlertFilter(e.target.value as typeof alertFilter)}
              className="px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl font-bold text-stone-700 focus:outline-none focus:border-rose-500"
            >
              <option value="todos">Todos os Alertas</option>
              <option value="vencidos">⚠️ Produtos Vencidos</option>
              <option value="vencer_7d">⏳ Vencimento em 7 Dias</option>
              <option value="vencer_30d">📅 Vencimento em 30 Dias</option>
              <option value="estoque_baixo">📉 Estoque Baixo (≤2 un)</option>
              <option value="sem_estoque">🚫 Sem Estoque (0 un)</option>
            </select>

            {/* Sorting */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              className="px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl font-semibold text-stone-700 focus:outline-none focus:border-rose-500"
            >
              <option value="nome">Ordenar: Nome (A-Z)</option>
              <option value="menor_estoque">Ordenar: Menor Estoque First</option>
              <option value="validade_proxima">Ordenar: Validade Mais Próxima</option>
              <option value="maior_preco">Ordenar: Maior Preço</option>
            </select>

            {/* Category Dropdown */}
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl font-medium text-stone-700 focus:outline-none focus:border-rose-500"
            >
              <option value="todas">Todas as Categorias</option>
              {categoriesList.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>

            {/* Stock Filter */}
            <select
              value={stockFilter}
              onChange={(e) => setStockFilter(e.target.value as typeof stockFilter)}
              className="px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-medium text-stone-700 focus:outline-none focus:border-rose-500"
            >
              <option value="todos">Todo Estoque</option>
              <option value="normal">Estoque Normal</option>
              <option value="baixo">Estoque Baixo (Alerta)</option>
              <option value="esgotado">Esgotado (Zero)</option>
            </select>

            {/* Expiry Filter */}
            <select
              value={expiryFilter}
              onChange={(e) => setExpiryFilter(e.target.value as typeof expiryFilter)}
              className="px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-medium text-stone-700 focus:outline-none focus:border-rose-500"
            >
              <option value="todos">Todas Validades</option>
              <option value="proximo">Próximo do Vencimento (&lt;15 dias)</option>
              <option value="vencido">Vencidos</option>
            </select>

            {/* Supplier Filter */}
            {suppliersList.length > 0 && (
              <select
                value={supplierFilter}
                onChange={(e) => setSupplierFilter(e.target.value)}
                className="px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-medium text-stone-700 focus:outline-none focus:border-rose-500"
              >
                <option value="todos">Todos os Fornecedores</option>
                {suppliersList.map((sup) => (
                  <option key={sup.id} value={sup.id}>
                    {sup.name}
                  </option>
                ))}
              </select>
            )}

            {/* View Mode Toggle */}
            <div className="flex items-center bg-stone-100 p-1 rounded-xl ml-auto border border-stone-200">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-lg text-xs transition-all ${
                  viewMode === 'grid'
                    ? 'bg-white text-rose-600 shadow-xs font-bold'
                    : 'text-stone-500 hover:text-stone-900'
                }`}
                title="Visualização em Cards"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`p-1.5 rounded-lg text-xs transition-all ${
                  viewMode === 'table'
                    ? 'bg-white text-rose-600 shadow-xs font-bold'
                    : 'text-stone-500 hover:text-stone-900'
                }`}
                title="Visualização em Tabela"
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Active Filters Summary Chips */}
        {(selectedCategory !== 'todas' || stockFilter !== 'todos' || expiryFilter !== 'todos' || supplierFilter !== 'todos' || searchTerm) && (
          <div className="flex items-center flex-wrap gap-2 pt-2 border-t border-stone-100 text-xs">
            <span className="text-stone-400 font-medium">Filtros Ativos:</span>
            {selectedCategory !== 'todas' && (
              <span className="px-2.5 py-1 bg-rose-50 text-rose-700 font-bold rounded-lg border border-rose-200 flex items-center space-x-1">
                <span>Cat: {categoriesList.find((c) => c.id === selectedCategory)?.name}</span>
                <button onClick={() => setSelectedCategory('todas')}><X className="w-3 h-3" /></button>
              </span>
            )}
            {stockFilter !== 'todos' && (
              <span className="px-2.5 py-1 bg-amber-50 text-amber-700 font-bold rounded-lg border border-amber-200 flex items-center space-x-1">
                <span>Estoque: {stockFilter}</span>
                <button onClick={() => setStockFilter('todos')}><X className="w-3 h-3" /></button>
              </span>
            )}
            {expiryFilter !== 'todos' && (
              <span className="px-2.5 py-1 bg-rose-50 text-rose-700 font-bold rounded-lg border border-rose-200 flex items-center space-x-1">
                <span>Validade: {expiryFilter}</span>
                <button onClick={() => setExpiryFilter('todos')}><X className="w-3 h-3" /></button>
              </span>
            )}
            <button
              onClick={() => {
                setSelectedCategory('todas');
                setStockFilter('todos');
                setExpiryFilter('todos');
                setSupplierFilter('todos');
                setSearchTerm('');
              }}
              className="text-stone-500 hover:text-rose-600 underline font-semibold text-[11px] ml-auto"
            >
              Limpar Todos os Filtros
            </button>
          </div>
        )}
      </div>

      {/* Content Area */}
      {filteredProducts.length === 0 ? (
        <div className="bg-white border border-stone-200/80 rounded-3xl p-12 text-center shadow-xs flex flex-col items-center justify-center">
          <div className="w-16 h-16 rounded-2xl bg-rose-50 text-rose-500 flex items-center justify-center mb-3">
            <Package className="w-8 h-8" />
          </div>
          <h3 className="text-base font-bold text-stone-800">Nenhum produto encontrado</h3>
          <p className="text-xs text-stone-400 max-w-sm mt-1 mb-4">
            Nenhum item corresponde aos critérios de pesquisa ou aos filtros selecionados.
          </p>
          <button
            onClick={handleOpenNewProduct}
            className="px-5 py-2.5 bg-rose-600 text-white rounded-xl text-xs font-bold hover:bg-rose-700 transition-colors inline-flex items-center space-x-1.5 shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Cadastrar Novo Produto</span>
          </button>
        </div>
      ) : viewMode === 'grid' ? (
        /* GRID CARDS VIEW */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredProducts.map((product) => {
            const categoryObj = categoriesList.find((c) => c.id === product.categoryId);
            const expiryStatus = getExpiryStatus(product.expiryDate);
            const isLowStock = product.stockQuantity <= product.minStock;
            const profit = product.salePrice - product.costPrice;

            return (
              <div
                key={product.id}
                className="bg-white rounded-3xl border border-stone-200/80 hover:border-rose-200 transition-all shadow-xs hover:shadow-md overflow-hidden flex flex-col group"
              >
                {/* Photo & Badge Banner */}
                <div className="relative aspect-4/3 bg-stone-100 overflow-hidden">
                  {product.imageUrl ? (
                    <img
                      src={product.imageUrl}
                      alt={product.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-stone-300">
                      <Package className="w-12 h-12" />
                      <span className="text-[10px] uppercase font-bold text-stone-400 mt-1">
                        Sem Foto
                      </span>
                    </div>
                  )}

                  {/* Top Floating Badges */}
                  <div className="absolute top-2 left-2 flex flex-col gap-1">
                    {categoryObj && (
                      <span className="px-2.5 py-1 bg-stone-900/80 backdrop-blur-xs text-white text-[10px] font-bold rounded-lg uppercase tracking-wider">
                        {categoryObj.name}
                      </span>
                    )}
                  </div>

                  {/* Stock Status Badge */}
                  <div className="absolute top-2 right-2">
                    {isLowStock ? (
                      <span className="px-2.5 py-1 bg-amber-500 text-white text-[10px] font-bold rounded-lg shadow-sm flex items-center space-x-1">
                        <AlertTriangle className="w-3 h-3" />
                        <span>Estoque Crítico ({product.stockQuantity})</span>
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 bg-emerald-600/90 text-white text-[10px] font-bold rounded-lg shadow-sm">
                        {product.stockQuantity} {product.unit}
                      </span>
                    )}
                  </div>

                  {/* Barcode Overlay if present */}
                  {product.barcode && (
                    <div className="absolute bottom-2 left-2 bg-white/90 backdrop-blur-xs px-2 py-0.5 rounded-md text-[10px] font-mono text-stone-700 font-bold border border-stone-200 flex items-center space-x-1">
                      <Barcode className="w-3 h-3 text-stone-500" />
                      <span>{product.barcode}</span>
                    </div>
                  )}
                </div>

                {/* Card Info */}
                <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between text-[11px] text-stone-400 mb-1">
                      <span className="font-mono font-bold text-stone-500">{product.code}</span>
                      {product.supplierName && (
                        <span className="truncate max-w-[120px] text-stone-500 font-medium">
                          {product.supplierName}
                        </span>
                      )}
                    </div>

                    <h3 className="text-sm font-bold text-stone-900 line-clamp-2 leading-snug">
                      {product.name}
                    </h3>

                    {/* Category Tags */}
                    {product.categoryTags && product.categoryTags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {product.categoryTags.map((tag) => (
                          <span
                            key={tag}
                            className="px-2 py-0.5 bg-stone-100 text-stone-600 text-[10px] font-semibold rounded-md"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Expiry Warning */}
                    {expiryStatus !== 'none' && (
                      <div className="mt-2 text-[11px]">
                        {expiryStatus === 'vencido' ? (
                          <span className="text-rose-600 font-bold flex items-center space-x-1">
                            <Calendar className="w-3 h-3" />
                            <span>Vencido em: {product.expiryDate}</span>
                          </span>
                        ) : expiryStatus === 'proximo' ? (
                          <span className="text-amber-600 font-bold flex items-center space-x-1">
                            <Calendar className="w-3 h-3" />
                            <span>Validade Próxima: {product.expiryDate}</span>
                          </span>
                        ) : (
                          <span className="text-stone-400 flex items-center space-x-1">
                            <Calendar className="w-3 h-3" />
                            <span>Val: {product.expiryDate}</span>
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Pricing & Actions */}
                  <div className="pt-3 border-t border-stone-100 space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-[10px] font-semibold text-stone-400 block uppercase">
                          Custo: R$ {product.costPrice.toFixed(2)}
                        </span>
                        <span className="text-base font-black text-emerald-700">
                          R$ {product.salePrice.toFixed(2)}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100 block">
                          +R$ {profit.toFixed(2)}
                        </span>
                      </div>
                    </div>

                    {/* Action Bar */}
                    <div className="flex items-center justify-between pt-1">
                      {/* Stock Adjuster Button */}
                      <button
                        onClick={() => {
                          setStockModalProduct(product);
                          setIsStockModalOpen(true);
                        }}
                        className="px-2.5 py-1 bg-stone-100 hover:bg-rose-50 text-stone-800 hover:text-rose-600 font-bold rounded-xl text-xs flex items-center space-x-1 transition-colors border border-stone-200/80"
                        title="Ajustar estoque ou ver histórico"
                      >
                        <RefreshCw className="w-3 h-3 text-rose-500" />
                        <span>Estoque: {product.stockQuantity}</span>
                      </button>

                      <div className="flex items-center space-x-1">
                        <button
                          onClick={() => handleDuplicateProduct(product)}
                          className="p-1.5 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-lg transition-colors"
                          title="Duplicar Produto"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleOpenEditProduct(product)}
                          className="p-1.5 text-stone-600 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          title="Editar Produto"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setDeleteConfirmId(product.id)}
                          className="p-1.5 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          title="Excluir Produto"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* COMPACT TABLE VIEW */
        <div className="bg-white rounded-3xl border border-stone-200/80 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-stone-50/80 border-b border-stone-100 text-[11px] font-bold uppercase text-stone-400 tracking-wider">
                  <th className="p-4">Produto</th>
                  <th className="p-4">Código / Cód. Barras</th>
                  <th className="p-4">Categoria & Tags</th>
                  <th className="p-4">Custo / Venda</th>
                  <th className="p-4">Estoque</th>
                  <th className="p-4">Validade</th>
                  <th className="p-4">Fornecedor</th>
                  <th className="p-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 text-xs text-stone-700 font-medium">
                {filteredProducts.map((product) => {
                  const categoryObj = categoriesList.find((c) => c.id === product.categoryId);
                  const expiryStatus = getExpiryStatus(product.expiryDate);
                  const isLowStock = product.stockQuantity <= product.minStock;

                  return (
                    <tr key={product.id} className="hover:bg-stone-50/50 transition-colors">
                      {/* Produto & Thumbnail */}
                      <td className="p-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 rounded-xl bg-stone-100 overflow-hidden shrink-0 border border-stone-200">
                            {product.imageUrl ? (
                              <img src={product.imageUrl} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-stone-300">
                                <Package className="w-5 h-5" />
                              </div>
                            )}
                          </div>
                          <div>
                            <span className="font-bold text-stone-900 block leading-tight">{product.name}</span>
                            <span className="text-[10px] text-stone-400">{product.unit}</span>
                          </div>
                        </div>
                      </td>

                      {/* Código & Barcode */}
                      <td className="p-4">
                        <span className="font-mono font-bold text-stone-800 block">{product.code}</span>
                        {product.barcode ? (
                          <span className="text-[10px] font-mono text-stone-500 flex items-center space-x-1">
                            <Barcode className="w-3 h-3 text-stone-400" />
                            <span>{product.barcode}</span>
                          </span>
                        ) : (
                          <span className="text-[10px] text-stone-300">-</span>
                        )}
                      </td>

                      {/* Categoria */}
                      <td className="p-4">
                        <span className="px-2 py-0.5 bg-stone-100 text-stone-700 font-bold rounded-md text-[11px] inline-block mb-1">
                          {categoryObj?.name || 'Sem cat'}
                        </span>
                        {product.categoryTags && product.categoryTags.length > 0 && (
                          <div className="text-[10px] text-stone-400 truncate max-w-[140px]">
                            {product.categoryTags.map((t) => `#${t}`).join(' ')}
                          </div>
                        )}
                      </td>

                      {/* Preços */}
                      <td className="p-4">
                        <span className="text-stone-400 text-[10px] block">R$ {product.costPrice.toFixed(2)}</span>
                        <span className="font-bold text-emerald-700">R$ {product.salePrice.toFixed(2)}</span>
                      </td>

                      {/* Estoque */}
                      <td className="p-4">
                        <button
                          onClick={() => {
                            setStockModalProduct(product);
                            setIsStockModalOpen(true);
                          }}
                          className={`px-2.5 py-1 rounded-xl text-xs font-bold border flex items-center space-x-1 hover:bg-rose-50 transition-colors ${
                            isLowStock
                              ? 'bg-amber-50 text-amber-700 border-amber-200'
                              : 'bg-stone-50 text-stone-800 border-stone-200'
                          }`}
                          title="Ajustar estoque ou ver histórico"
                        >
                          <RefreshCw className="w-3 h-3 text-rose-500 shrink-0" />
                          <span>{product.stockQuantity} {product.unit}</span>
                        </button>
                      </td>

                      {/* Validade */}
                      <td className="p-4">
                        {product.expiryDate ? (
                          <span className={`font-semibold ${expiryStatus === 'vencido' ? 'text-rose-600' : expiryStatus === 'proximo' ? 'text-amber-600' : 'text-stone-600'}`}>
                            {product.expiryDate}
                          </span>
                        ) : (
                          <span className="text-stone-300">-</span>
                        )}
                      </td>

                      {/* Fornecedor */}
                      <td className="p-4 text-stone-600">
                        {product.supplierName || '-'}
                      </td>

                      {/* Ações */}
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end space-x-1">
                          <button
                            onClick={() => handleOpenEditProduct(product)}
                            className="p-1.5 text-stone-600 hover:text-rose-600 hover:bg-rose-50 rounded-lg"
                            title="Editar"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setDeleteConfirmId(product.id)}
                            className="p-1.5 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg"
                            title="Excluir"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Product Registration & Edit Modal */}
      <ProductFormModal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSave={handleSaveProduct}
        productToEdit={productToEdit}
        categories={categoriesList}
        suppliers={suppliersList}
      />

      {/* Search Barcode Scanner Modal */}
      <BarcodeScannerModal
        isOpen={isSearchBarcodeScannerOpen}
        onClose={() => setIsSearchBarcodeScannerOpen(false)}
        onScanSuccess={(scannedCode) => {
          setSearchTerm(scannedCode);
        }}
        title="Escanear Código de Barras para Buscar"
      />

      {/* Stock Movement & History Modal */}
      <StockMovementModal
        isOpen={isStockModalOpen}
        onClose={() => setIsStockModalOpen(false)}
        product={stockModalProduct}
      />

      {/* Delete Confirmation Dialog */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-stone-200 text-center space-y-4">
            <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-stone-900">Excluir Produto?</h3>
              <p className="text-xs text-stone-500 mt-1">
                Esta ação removerá permanentemente este item do seu banco de dados.
              </p>
            </div>
            <div className="flex items-center justify-center space-x-2 pt-2">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 font-semibold text-xs rounded-xl"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleDeleteProduct(deleteConfirmId)}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-xs"
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
