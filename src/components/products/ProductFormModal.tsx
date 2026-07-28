import React, { useState, useEffect } from 'react';
import {
  X,
  Camera,
  Upload,
  Barcode,
  Tag,
  Plus,
  Trash2,
  DollarSign,
  Package,
  Calendar,
  Building2,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  AlertTriangle
} from 'lucide-react';
import { Product, Category, Supplier } from '../../types';
import { CameraCaptureModal } from './CameraCaptureModal';
import { BarcodeScannerModal } from './BarcodeScannerModal';
import { db } from '../../db';
import { formatCurrency } from '../../utils/formatters';

interface ProductFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (product: Partial<Product>) => Promise<void>;
  productToEdit?: Product | null;
  categories: Category[];
  suppliers: Supplier[];
}

export const ProductFormModal: React.FC<ProductFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  productToEdit,
  categories,
  suppliers
}) => {
  // Form State
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [barcode, setBarcode] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [categoryTags, setCategoryTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [unit, setUnit] = useState<Product['unit']>('unidade');
  const [costPrice, setCostPrice] = useState<string>('0.00');
  const [salePrice, setSalePrice] = useState<string>('0.00');
  const [stockQuantity, setStockQuantity] = useState<string>('0');
  const [minStock, setMinStock] = useState<string>('5');
  const [expiryDate, setExpiryDate] = useState('');
  const [supplierId, setSupplierId] = useState('');
  const [supplierName, setSupplierName] = useState('');
  const [imageUrl, setImageUrl] = useState('');

  // Modals & UI states
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [isBarcodeScannerOpen, setIsBarcodeScannerOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (productToEdit) {
      setName(productToEdit.name || '');
      setCode(productToEdit.code || `PRD-${Math.floor(100 + Math.random() * 900)}`);
      setBarcode(productToEdit.barcode || '');
      setCategoryId(productToEdit.categoryId || (categories[0]?.id || 'cat_04'));
      setCategoryTags(productToEdit.categoryTags || []);
      setUnit(productToEdit.unit || 'unidade');
      setCostPrice(productToEdit.costPrice?.toFixed(2) || '0.00');
      setSalePrice(productToEdit.salePrice?.toFixed(2) || '0.00');
      setStockQuantity(String(productToEdit.stockQuantity ?? 0));
      setMinStock(String(productToEdit.minStock ?? 5));
      setExpiryDate(productToEdit.expiryDate || '');
      setSupplierId(productToEdit.supplierId || '');
      setSupplierName(productToEdit.supplierName || '');
      setImageUrl(productToEdit.imageUrl || '');
    } else {
      // Default new product
      setName('');
      setCode(`PRD-${Math.floor(100 + Math.random() * 900)}`);
      setBarcode('');
      setCategoryId(categories[0]?.id || 'cat_04');
      setCategoryTags([]);
      setUnit('unidade');
      setCostPrice('0.00');
      setSalePrice('0.00');
      setStockQuantity('10');
      setMinStock('5');
      setExpiryDate('');
      setSupplierId('');
      setSupplierName('');
      setImageUrl('');
    }
    setErrorMessage(null);
  }, [productToEdit, isOpen, categories]);

  // Calculations for Margin
  const cost = parseFloat(costPrice) || 0;
  const sale = parseFloat(salePrice) || 0;
  const profit = sale - cost;
  const marginPercent = cost > 0 ? ((profit / cost) * 100).toFixed(1) : '0';

  // Tag Handling
  const handleAddTag = () => {
    if (!tagInput.trim()) return;
    const cleanTag = tagInput.trim().replace(/^#/, '');
    if (!categoryTags.includes(cleanTag)) {
      setCategoryTags([...categoryTags, cleanTag]);
    }
    setTagInput('');
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setCategoryTags(categoryTags.filter((t) => t !== tagToRemove));
  };

  // Image File Upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setErrorMessage('Imagem muito grande. Escolha um arquivo de até 5MB.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setImageUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Generate random EAN-13 style barcode
  const handleGenerateBarcode = () => {
    const randomEan = '789' + Math.floor(100000000 + Math.random() * 900000000);
    setBarcode(randomEan);
  };

  // Supplier Sync
  const handleSupplierChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedId = e.target.value;
    setSupplierId(selectedId);
    const found = suppliers.find((s) => s.id === selectedId);
    if (found) {
      setSupplierName(found.name);
    } else {
      setSupplierName('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedCost = parseFloat(costPrice);
    const parsedSale = parseFloat(salePrice);
    const parsedStock = parseInt(stockQuantity, 10);
    const parsedMinStock = parseInt(minStock, 10);

    if (!name.trim()) {
      setErrorMessage('Nome do produto é obrigatório.');
      return;
    }
    if (!categoryId) {
      setErrorMessage('Categoria é obrigatória.');
      return;
    }
    if (isNaN(parsedCost) || parsedCost < 0) {
      setErrorMessage('Valor de custo não pode ser negativo.');
      return;
    }
    if (isNaN(parsedSale) || parsedSale < 0) {
      setErrorMessage('Valor de venda não pode ser negativo.');
      return;
    }
    if (isNaN(parsedStock) || parsedStock < 0) {
      setErrorMessage('Quantidade de estoque não pode ser negativa.');
      return;
    }
    if (isNaN(parsedMinStock) || parsedMinStock < 0) {
      setErrorMessage('Estoque mínimo não pode ser negativo.');
      return;
    }

    // Unique barcode validation if barcode is provided
    const cleanBarcode = barcode.trim();
    if (cleanBarcode) {
      try {
        const allProducts = await db.produtos.toArray();
        const duplicate = allProducts.find(
          (p) => p.barcode?.trim() === cleanBarcode && p.id !== productToEdit?.id
        );
        if (duplicate) {
          setErrorMessage(`O código de barras "${cleanBarcode}" já está cadastrado no produto "${duplicate.name}".`);
          return;
        }
      } catch (err) {
        console.error('Erro ao verificar código de barras:', err);
      }
    }

    // Expiry date validation
    if (expiryDate) {
      const expDate = new Date(expiryDate);
      if (isNaN(expDate.getTime())) {
        setErrorMessage('Data de validade informada é inválida.');
        return;
      }
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const productData: Partial<Product> = {
        name: name.trim(),
        code: code.trim() || `PRD-${Date.now()}`,
        barcode: cleanBarcode,
        categoryId,
        categoryTags,
        unit,
        costPrice: parsedCost,
        salePrice: parsedSale,
        stockQuantity: parsedStock,
        minStock: parsedMinStock,
        expiryDate: expiryDate || undefined,
        supplierId: supplierId || undefined,
        supplierName: supplierName.trim() || undefined,
        imageUrl: imageUrl || undefined
      };

      if (productToEdit?.id) {
        productData.id = productToEdit.id;
      }

      await onSave(productData);
      setIsSubmitting(false);
      onClose();
    } catch (err) {
      console.error('Erro ao salvar produto:', err);
      setErrorMessage('Erro ao salvar no banco de dados. Tente novamente.');
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-40 flex items-center justify-center bg-stone-900/60 backdrop-blur-xs p-4 overflow-y-auto">
        <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-stone-200 overflow-hidden my-auto animate-in fade-in zoom-in duration-200">
          {/* Header */}
          <div className="p-5 border-b border-stone-100 bg-stone-50/80 flex items-center justify-between sticky top-0 z-10">
            <div className="flex items-center space-x-2 text-rose-600">
              <Package className="w-6 h-6" />
              <div>
                <h2 className="text-base font-bold text-stone-900">
                  {productToEdit ? 'Editar Produto' : 'Cadastro Completo de Produto'}
                </h2>
                <p className="text-xs text-stone-500">
                  Preencha os dados de identificação, fotos, precificação e estoque.
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-stone-400 hover:text-stone-700 hover:bg-stone-200/60 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form Body */}
          <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-6">
            {errorMessage && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Section 1: Top Main info & Image Upload / Camera */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Image & Camera Column */}
              <div className="space-y-3">
                <label className="block text-xs font-bold text-stone-700">Foto do Produto</label>
                <div className="relative group aspect-square rounded-2xl bg-stone-100 border-2 border-dashed border-stone-300 flex flex-col items-center justify-center overflow-hidden transition-all hover:border-rose-400">
                  {imageUrl ? (
                    <>
                      <img src={imageUrl} alt="Preview" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setImageUrl('')}
                        className="absolute top-2 right-2 p-1.5 bg-rose-600 text-white rounded-lg opacity-90 hover:opacity-100 shadow-md transition-opacity"
                        title="Remover foto"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </>
                  ) : (
                    <div className="p-4 text-center space-y-2 text-stone-400">
                      <Package className="w-10 h-10 mx-auto text-stone-300" />
                      <p className="text-[11px] font-medium text-stone-500">Nenhuma imagem definida</p>
                    </div>
                  )}
                </div>

                {/* Upload Buttons */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setIsCameraOpen(true)}
                    className="px-3 py-2 bg-stone-900 hover:bg-stone-800 text-white font-semibold rounded-xl text-xs flex items-center justify-center space-x-1.5 transition-colors"
                  >
                    <Camera className="w-3.5 h-3.5 text-rose-400" />
                    <span>Usar Câmera</span>
                  </button>

                  <label className="px-3 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 font-semibold rounded-xl text-xs flex items-center justify-center space-x-1.5 cursor-pointer transition-colors">
                    <Upload className="w-3.5 h-3.5 text-stone-500" />
                    <span>Upload</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              {/* Main Fields Column */}
              <div className="md:col-span-2 space-y-4">
                {/* Nome do Produto */}
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    Nome do Produto <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ex: Suco de Laranja Integral 500ml"
                    className="w-full px-3.5 py-2.5 bg-white border border-stone-200 rounded-xl text-xs font-medium focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500"
                  />
                </div>

                {/* Código de Barras & Código Interno */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1">
                      Código de Barras (EAN / UPC)
                    </label>
                    <div className="flex items-center space-x-1.5">
                      <div className="relative flex-1">
                        <Barcode className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                        <input
                          type="text"
                          value={barcode}
                          onChange={(e) => setBarcode(e.target.value)}
                          placeholder="7891234567890"
                          className="w-full pl-9 pr-3 py-2 bg-white border border-stone-200 rounded-xl text-xs font-mono font-medium focus:outline-none focus:border-rose-500"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsBarcodeScannerOpen(true)}
                        title="Escanear com a Câmera"
                        className="p-2 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl border border-rose-200 transition-colors"
                      >
                        <Camera className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={handleGenerateBarcode}
                        title="Gerar código aleatório"
                        className="px-2 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 text-[11px] font-semibold rounded-xl transition-colors"
                      >
                        Gerar
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1">
                      Código Interno / SKU
                    </label>
                    <input
                      type="text"
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                      placeholder="PRD-101"
                      className="w-full px-3.5 py-2 bg-white border border-stone-200 rounded-xl text-xs font-mono font-medium focus:outline-none focus:border-rose-500"
                    />
                  </div>
                </div>

                {/* Categoria & Unidade */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-stone-700 mb-1">
                      Categoria Principal <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={categoryId}
                      onChange={(e) => setCategoryId(e.target.value)}
                      className="w-full px-3.5 py-2 bg-white border border-stone-200 rounded-xl text-xs font-medium focus:outline-none focus:border-rose-500"
                    >
                      {categories.map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.name} ({cat.type})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1">Unidade</label>
                    <select
                      value={unit}
                      onChange={(e) => setUnit(e.target.value as Product['unit'])}
                      className="w-full px-3.5 py-2 bg-white border border-stone-200 rounded-xl text-xs font-medium focus:outline-none focus:border-rose-500"
                    >
                      <option value="unidade">Unidade (un)</option>
                      <option value="pacote">Pacote (pct)</option>
                      <option value="kg">Quilo (kg)</option>
                      <option value="g">Gramas (g)</option>
                      <option value="ml">Mililitros (ml)</option>
                    </select>
                  </div>
                </div>

                {/* Category Tags Manager */}
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    Tags de Categoria / Filtros Rápidos
                  </label>
                  <div className="flex items-center space-x-2 mb-2">
                    <div className="relative flex-1">
                      <Tag className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                      <input
                        type="text"
                        value={tagInput}
                        onChange={(e) => setTagInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddTag();
                          }
                        }}
                        placeholder="Ex: Gourmet, Sem Lactose, Gelado (Enter)"
                        className="w-full pl-8 pr-3 py-1.5 bg-white border border-stone-200 rounded-xl text-xs focus:outline-none focus:border-rose-500"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleAddTag}
                      className="px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-xs rounded-xl flex items-center space-x-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Tag</span>
                    </button>
                  </div>

                  {categoryTags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {categoryTags.map((tag) => (
                        <span
                          key={tag}
                          className="px-2.5 py-1 bg-rose-50 border border-rose-200 text-rose-700 text-[11px] font-bold rounded-lg flex items-center space-x-1"
                        >
                          <span>#{tag}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveTag(tag)}
                            className="hover:text-rose-900"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <hr className="border-stone-100" />

            {/* Section 2: Precificação & Margem de Lucro */}
            <div className="bg-stone-50/70 p-4 rounded-2xl border border-stone-200/80 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2 text-stone-800">
                  <DollarSign className="w-4 h-4 text-emerald-600" />
                  <h3 className="text-xs font-bold uppercase tracking-wider">Precificação & Lucratividade</h3>
                </div>
                <div className="text-right text-xs">
                  <span className="text-stone-500">Lucro Estimado: </span>
                  <span className={`font-bold ${profit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {formatCurrency(profit)} ({marginPercent}%)
                  </span>
                </div>
              </div>

              {sale > 0 && cost > 0 && sale < cost && (
                <div className="p-2.5 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl text-xs flex items-center space-x-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Atenção: O preço de venda ({formatCurrency(sale)}) é menor que o preço de custo ({formatCurrency(cost)}). Isso gerará prejuízo por unidade.</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">Preço de Custo (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={costPrice}
                    onChange={(e) => setCostPrice(e.target.value)}
                    placeholder="0.00"
                    className="w-full px-3.5 py-2 bg-white border border-stone-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-rose-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">Preço de Venda (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={salePrice}
                    onChange={(e) => setSalePrice(e.target.value)}
                    placeholder="0.00"
                    className="w-full px-3.5 py-2 bg-white border border-stone-200 rounded-xl text-xs font-bold text-emerald-700 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>
            </div>

            {/* Section 3: Controle de Estoque, Validade & Fornecedor */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Estoque Atual */}
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">Estoque Atual</label>
                <input
                  type="number"
                  min="0"
                  value={stockQuantity}
                  onChange={(e) => setStockQuantity(e.target.value)}
                  className="w-full px-3.5 py-2 bg-white border border-stone-200 rounded-xl text-xs font-bold focus:outline-none focus:border-rose-500"
                />
              </div>

              {/* Estoque Mínimo */}
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Estoque Mínimo (Alerta)
                </label>
                <input
                  type="number"
                  min="0"
                  value={minStock}
                  onChange={(e) => setMinStock(e.target.value)}
                  className="w-full px-3.5 py-2 bg-white border border-stone-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-rose-500"
                />
              </div>

              {/* Data de Validade */}
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Data de Validade (Lote)
                </label>
                <div className="relative">
                  <Calendar className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                  <input
                    type="date"
                    value={expiryDate}
                    onChange={(e) => setExpiryDate(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-white border border-stone-200 rounded-xl text-xs font-medium focus:outline-none focus:border-rose-500"
                  />
                </div>
              </div>
            </div>

            {/* Section 4: Fornecedor */}
            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1">Fornecedor Principal</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {suppliers.length > 0 ? (
                  <select
                    value={supplierId}
                    onChange={handleSupplierChange}
                    className="w-full px-3.5 py-2 bg-white border border-stone-200 rounded-xl text-xs font-medium focus:outline-none focus:border-rose-500"
                  >
                    <option value="">Selecione um fornecedor cadastrado...</option>
                    {suppliers.map((sup) => (
                      <option key={sup.id} value={sup.id}>
                        {sup.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="text-xs text-stone-400 flex items-center space-x-1 py-2">
                    <Building2 className="w-4 h-4" />
                    <span>Nenhum fornecedor registrado. Digite ao lado:</span>
                  </div>
                )}

                <input
                  type="text"
                  value={supplierName}
                  onChange={(e) => setSupplierName(e.target.value)}
                  placeholder="Nome do Fornecedor / Distribuidor"
                  className="w-full px-3.5 py-2 bg-white border border-stone-200 rounded-xl text-xs font-medium focus:outline-none focus:border-rose-500"
                />
              </div>
            </div>

            {/* Submit Actions */}
            <div className="pt-4 border-t border-stone-100 flex items-center justify-end space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-semibold transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center space-x-1.5 active:scale-95 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <span>Salvando...</span>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{productToEdit ? 'Atualizar Produto' : 'Cadastrar Produto'}</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Sub-modals for Camera & Barcode */}
      <CameraCaptureModal
        isOpen={isCameraOpen}
        onClose={() => setIsCameraOpen(false)}
        onCapture={(img) => setImageUrl(img)}
      />

      <BarcodeScannerModal
        isOpen={isBarcodeScannerOpen}
        onClose={() => setIsBarcodeScannerOpen(false)}
        onScanSuccess={(scannedBarcode) => setBarcode(scannedBarcode)}
      />
    </>
  );
};
