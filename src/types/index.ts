export type UserRole = 'admin' | 'operador' | 'funcionario';

export interface User {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  active: boolean;
  createdAt: string;
}

export type CategoryType = 'cesta' | 'insumo' | 'item';

export interface Category {
  id: string;
  name: string;
  type: CategoryType;
  description?: string;
}
export type Categoria = Category;

export interface Product {
  id: string;
  code: string;
  name: string;
  categoryId: string; // Relational FK -> Category.id
  unit: 'unidade' | 'kg' | 'g' | 'ml' | 'pacote';
  costPrice: number;
  salePrice: number;
  stockQuantity: number;
  minStock: number;
  imageUrl?: string;
  barcode?: string;
  categoryTags?: string[];
  expiryDate?: string;
  supplierId?: string;
  supplierName?: string;
}
export type Produto = Product;

export interface Basket {
  id: string;
  code: string;
  name: string;
  categoryId: string; // Relational FK -> Category.id
  description: string;
  salePrice: number;
  estimatedCost: number;
  active: boolean;
}

// Relational BOM (Bill of Materials) linking Products to Baskets
export interface BasketItem {
  id: string;
  basketId: string; // Relational FK -> Basket.id
  productId: string; // Relational FK -> Product.id
  quantity: number;
}

export interface Client {
  id: string;
  name: string;
  phone: string;
  whatsapp?: string;
  email?: string;
  address: string;
  neighborhood?: string;
  city?: string;
  birthDate?: string;
  observations?: string;
  latitude?: number;
  longitude?: number;
  createdAt: string;
}
export type Cliente = Client;

export type OrderStatus = 'pendente' | 'em_producao' | 'pronto' | 'saiu_entrega' | 'entregue' | 'cancelado';
export type PaymentStatus = 'pendente' | 'pago' | 'parcial';
export type PaymentMethod = 'pix' | 'cartao_credito' | 'cartao_debito' | 'dinheiro' | 'transferencia' | 'faturado' | 'outro';
export type DeliveryPeriod = 'manha_cedo' | 'manha_padrao' | 'tarde' | 'horario_fixo';

export interface Venda {
  id: string;
  orderNumber: string;
  clientId: string; // Relational FK -> Client.id
  status: OrderStatus;
  deliveryDate: string;
  deliveryPeriod: DeliveryPeriod;
  deliveryAddress: string;
  recipientName: string;
  recipientPhone?: string;
  cardMessage?: string;
  paymentStatus: PaymentStatus;
  paymentMethod: PaymentMethod;
  receivedAmount?: number;
  changeAmount?: number;
  subtotal: number;
  deliveryFee: number;
  discount: number;
  totalAmount: number;
  notes?: string;
  createdAt: string;
}
export type Order = Venda;

export type StockMovementType =
  | 'entrada_manual'
  | 'saida_manual'
  | 'saida_venda'
  | 'ajuste_inventario'
  | 'perda_vencimento'
  | 'perda_dano';

export interface StockMovement {
  id: string;
  productId: string;
  productName?: string;
  type: StockMovementType;
  quantity: number;
  reason: string;
  userName?: string;
  createdAt: string;
}

// Relational ItemVenda linking Products or Baskets to a Venda
export interface ItemVenda {
  id: string;
  vendaId: string; // Relational FK -> Venda.id
  orderId?: string; // Relational FK -> Order.id (compatibility)
  basketId?: string; // Relational FK -> Basket.id
  productId?: string; // Relational FK -> Product.id
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  customNotes?: string;
}
export type OrderItem = ItemVenda;

export type TransactionType = 'receita' | 'despesa';
export type TransactionStatus = 'pago' | 'pendente';

export interface FluxoDeCaixa {
  id: string;
  type: TransactionType;
  category: string;
  description: string;
  amount: number;
  status: TransactionStatus;
  dueDate: string;
  paymentDate?: string;
  vendaId?: string; // Relational FK -> Venda.id (se receita de venda)
  orderId?: string; // Relational FK -> Order.id (compatibility)
  paymentMethod?: string;
  createdAt: string;
}
export type FinancialTransaction = FluxoDeCaixa;

export interface PesquisaSatisfacao {
  id: string;
  vendaId?: string; // Relational FK -> Venda.id
  clientId?: string; // Relational FK -> Client.id
  rating: number; // 1 a 5 estrelas
  deliveryRating?: number; // 1 a 5
  productQualityRating?: number; // 1 a 5
  feedback?: string;
  comment?: string;
  recommend?: boolean;
  createdAt: string;
}

export interface Supplier {
  id: string;
  name: string;
  contactName?: string;
  phone: string;
  email?: string;
  category?: string;
}

export type NavigationRoute = 
  | 'dashboard'
  | 'pedidos'
  | 'produtos'
  | 'clientes'
  | 'financeiro'
  | 'entregas'
  | 'relatorios'
  | 'configuracoes';

export interface RouteItem {
  id: NavigationRoute;
  label: string;
  iconName: string;
  badge?: number | string;
}
