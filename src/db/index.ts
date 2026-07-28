import Dexie, { type Table } from 'dexie';
import {
  User,
  Category,
  Product,
  Basket,
  BasketItem,
  Client,
  Venda,
  ItemVenda,
  FluxoDeCaixa,
  PesquisaSatisfacao,
  Supplier,
  StockMovement
} from '../types';

export class AfetoDatabase extends Dexie {
  users!: Table<User, string>;
  categorias!: Table<Category, string>;
  categories!: Table<Category, string>;
  produtos!: Table<Product, string>;
  products!: Table<Product, string>;
  baskets!: Table<Basket, string>;
  basketItems!: Table<BasketItem, string>;
  clientes!: Table<Client, string>;
  clients!: Table<Client, string>;
  vendas!: Table<Venda, string>;
  orders!: Table<Venda, string>;
  itensVenda!: Table<ItemVenda, string>;
  orderItems!: Table<ItemVenda, string>;
  fluxoDeCaixa!: Table<FluxoDeCaixa, string>;
  financialTransactions!: Table<FluxoDeCaixa, string>;
  pesquisasSatisfacao!: Table<PesquisaSatisfacao, string>;
  suppliers!: Table<Supplier, string>;
  stockMovements!: Table<StockMovement, string>;

  constructor() {
    super('AfetoDatabase');
    this.version(3).stores({
      users: 'id, email, role, active',
      categorias: 'id, name, type',
      categories: 'id, name, type',
      produtos: 'id, code, categoryId, name',
      products: 'id, code, categoryId, name',
      baskets: 'id, code, categoryId, name',
      basketItems: 'id, basketId, productId',
      clientes: 'id, name, phone, email',
      clients: 'id, name, phone, email',
      vendas: 'id, orderNumber, clientId, status, deliveryDate, paymentStatus',
      orders: 'id, orderNumber, clientId, status, deliveryDate, paymentStatus',
      itensVenda: 'id, vendaId, orderId, basketId, productId',
      orderItems: 'id, vendaId, orderId, basketId, productId',
      fluxoDeCaixa: 'id, type, status, dueDate, vendaId, orderId',
      financialTransactions: 'id, type, status, dueDate, vendaId, orderId',
      pesquisasSatisfacao: 'id, vendaId, clientId, rating',
      suppliers: 'id, name',
      stockMovements: 'id, productId, type, createdAt'
    });
  }
}

export const db = new AfetoDatabase();

/**
 * Seed initial sample data into the database tables
 */
export async function initializeDatabase() {
  try {
    // 1. Administrador Padrão
    const existingAdmin = await db.users.get('usr_admin_01');
    if (!existingAdmin) {
      const defaultAdmin: User = {
        id: 'usr_admin_01',
        name: 'Administrador AFETO',
        email: 'admin@afeto.com.br',
        passwordHash: 'admin123',
        role: 'admin',
        active: true,
        createdAt: new Date().toISOString()
      };
      await db.users.put(defaultAdmin);
    }

    const existingFunc = await db.users.get('usr_func_01');
    if (!existingFunc) {
      const defaultFunc: User = {
        id: 'usr_func_01',
        name: 'Atendente AFETO (Funcionário)',
        email: 'funcionario@afeto.com.br',
        passwordHash: 'func123',
        role: 'funcionario',
        active: true,
        createdAt: new Date().toISOString()
      };
      await db.users.put(defaultFunc);
    }

    // 2. Categorias de Exemplo
    const categoryCount = await db.categorias.count();
    if (categoryCount === 0) {
      const initialCategories: Category[] = [
        { id: 'cat_01', name: 'Cestas Matinais', type: 'cesta', description: 'Cestas de café da manhã clássicas e completas' },
        { id: 'cat_02', name: 'Cestas Românticas', type: 'cesta', description: 'Cestas de café com flores, espumante e chocolates' },
        { id: 'cat_03', name: 'Cestas Aniversário', type: 'cesta', description: 'Cestas comemorativas com balão e bolo artesanal' },
        { id: 'cat_04', name: 'Pães e Torradas', type: 'insumo', description: 'Itens de padaria fresquinhos e pães artesanais' },
        { id: 'cat_05', name: 'Bebidas e Sucos', type: 'insumo', description: 'Café gourmet, chás, sucos naturais e achocolatados' },
        { id: 'cat_06', name: 'Frios e Laticínios', type: 'insumo', description: 'Queijos nobres, presunto parma, manteigas e iogurtes' },
        { id: 'cat_07', name: 'Embalagens e Laços', type: 'item', description: 'Cestaria de vime, caixas kraft, laços de cetim e cartões' }
      ];
      await db.categorias.bulkPut(initialCategories);
      await db.categories.bulkPut(initialCategories);
    }

    // 3. Produtos de Exemplo
    const productCount = await db.produtos.count();
    if (productCount === 0) {
      const sampleProducts: Product[] = [
        {
          id: 'prod_01',
          code: 'INS-001',
          barcode: '7891000111223',
          name: 'Suco de Laranja Integral 500ml',
          categoryId: 'cat_05',
          categoryTags: ['Natural', 'SemAçúcar', 'Gelado'],
          unit: 'unidade',
          costPrice: 5.00,
          salePrice: 12.00,
          stockQuantity: 45,
          minStock: 10,
          expiryDate: '2026-08-15',
          supplierId: 'sup_01',
          supplierName: 'Distribuidora Bebidas Sol',
          imageUrl: 'https://images.unsplash.com/photo-1613478223719-2ab802602423?w=300&auto=format&fit=crop&q=80'
        },
        {
          id: 'prod_02',
          code: 'INS-002',
          barcode: '7891000222334',
          name: 'Mini Pão de Queijo Mineiro (250g)',
          categoryId: 'cat_04',
          categoryTags: ['Artesanal', 'Forno', 'Quentinho'],
          unit: 'pacote',
          costPrice: 7.50,
          salePrice: 18.00,
          stockQuantity: 4, // Crítico para testar alerta de estoque
          minStock: 8,
          expiryDate: '2026-08-01',
          supplierId: 'sup_02',
          supplierName: 'Padaria Artesanal Panis',
          imageUrl: 'https://images.unsplash.com/photo-1598142773945-c77461e8081f?w=300&auto=format&fit=crop&q=80'
        },
        {
          id: 'prod_03',
          code: 'INS-003',
          barcode: '7891000333445',
          name: 'Geleia Artesanal de Morango 200g',
          categoryId: 'cat_04',
          categoryTags: ['Doce', 'Gourmet', 'Fruity'],
          unit: 'unidade',
          costPrice: 8.00,
          salePrice: 19.90,
          stockQuantity: 25,
          minStock: 5,
          expiryDate: '2026-12-31',
          supplierId: 'sup_02',
          supplierName: 'Padaria Artesanal Panis',
          imageUrl: 'https://images.unsplash.com/photo-1568569350060-e8563f08c81e?w=300&auto=format&fit=crop&q=80'
        },
        {
          id: 'prod_04',
          code: 'INS-004',
          barcode: '7891000444556',
          name: 'Caneca de Porcelana AFETO Exclusiva',
          categoryId: 'cat_07',
          categoryTags: ['Brinde', 'Porcelana', 'Lembrança'],
          unit: 'unidade',
          costPrice: 12.00,
          salePrice: 28.00,
          stockQuantity: 60,
          minStock: 15,
          supplierId: 'sup_03',
          supplierName: 'Embalagens & Festas S.A.',
          imageUrl: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=300&auto=format&fit=crop&q=80'
        }
      ];
      await db.produtos.bulkPut(sampleProducts);
      await db.products.bulkPut(sampleProducts);
    }

    // 9. Fornecedores de Exemplo
    const supplierCount = await db.suppliers.count();
    if (supplierCount === 0) {
      const sampleSuppliers: Supplier[] = [
        { id: 'sup_01', name: 'Distribuidora Bebidas Sol', phone: '(11) 3333-1000', email: 'vendas@bebidassol.com.br', category: 'Bebidas' },
        { id: 'sup_02', name: 'Padaria Artesanal Panis', phone: '(11) 3333-2000', email: 'contato@panisartesanal.com.br', category: 'Pães e Geleias' },
        { id: 'sup_03', name: 'Embalagens & Festas S.A.', phone: '(11) 3333-3000', email: 'atendimento@embalagensfestas.com.br', category: 'Cestaria e Caixas' }
      ];
      await db.suppliers.bulkPut(sampleSuppliers);
    }

    // 4. Clientes de Exemplo
    const clientCount = await db.clientes.count();
    if (clientCount === 0) {
      const sampleClients: Client[] = [
        {
          id: 'cli_01',
          name: 'Maria Clara Oliveira',
          phone: '(11) 98888-1122',
          email: 'maria.oliveira@email.com',
          address: 'Av. Paulista, 1000 - Apto 82',
          neighborhood: 'Bela Vista',
          city: 'São Paulo',
          observations: 'Preferência por entregas entre 07:00 e 08:00.',
          createdAt: new Date().toISOString()
        },
        {
          id: 'cli_02',
          name: 'Roberto Carlos Silva',
          phone: '(11) 97777-3344',
          email: 'roberto.silva@email.com',
          address: 'Rua Augusta, 500 - Conjunto 12',
          neighborhood: 'Consolação',
          city: 'São Paulo',
          observations: 'Cliente corporativo frequente.',
          createdAt: new Date().toISOString()
        }
      ];
      await db.clientes.bulkPut(sampleClients);
      await db.clients.bulkPut(sampleClients);
    }

    // 5. Vendas (Pedidos) de Exemplo
    const vendaCount = await db.vendas.count();
    if (vendaCount === 0) {
      const sampleVendas: Venda[] = [
        {
          id: 'ven_01',
          orderNumber: 'VEN-2026-001',
          clientId: 'cli_01', // Relational FK -> Client cli_01
          status: 'entregue',
          deliveryDate: '2026-07-27',
          deliveryPeriod: 'manha_cedo',
          deliveryAddress: 'Av. Paulista, 1000 - Apto 82',
          recipientName: 'Carlos Eduardo Oliveira',
          recipientPhone: '(11) 99999-0011',
          cardMessage: 'Feliz Aniversário meu amor! Que seu dia seja tão doce quanto este café.',
          paymentStatus: 'pago',
          paymentMethod: 'pix',
          subtotal: 170.00,
          deliveryFee: 15.00,
          discount: 0,
          totalAmount: 185.00,
          notes: 'Entregar na portaria com o porteiro Silva.',
          createdAt: new Date().toISOString()
        },
        {
          id: 'ven_02',
          orderNumber: 'VEN-2026-002',
          clientId: 'cli_02', // Relational FK -> Client cli_02
          status: 'em_producao',
          deliveryDate: '2026-07-28',
          deliveryPeriod: 'manha_padrao',
          deliveryAddress: 'Rua Augusta, 500 - Conjunto 12',
          recipientName: 'Fernanda Lima',
          recipientPhone: '(11) 98888-2233',
          cardMessage: 'Parabéns pela promoção na empresa! Um abraço de toda a equipe.',
          paymentStatus: 'pago',
          paymentMethod: 'cartao_credito',
          subtotal: 195.00,
          deliveryFee: 15.00,
          discount: 10.00,
          totalAmount: 200.00,
          notes: 'Incluir cartão com logotipo da empresa.',
          createdAt: new Date().toISOString()
        }
      ];
      await db.vendas.bulkPut(sampleVendas);
      await db.orders.bulkPut(sampleVendas);
    }

    // 6. ItensVenda (Relacionamento n:n Venda <-> Produto)
    const itemVendaCount = await db.itensVenda.count();
    if (itemVendaCount === 0) {
      const sampleItensVenda: ItemVenda[] = [
        {
          id: 'itv_01',
          vendaId: 'ven_01', // Relational FK -> Venda ven_01
          orderId: 'ven_01',
          productId: 'prod_04', // Relational FK -> Produto prod_04
          quantity: 1,
          unitPrice: 28.00,
          totalPrice: 28.00,
          customNotes: 'Gravado com iniciais M&C'
        },
        {
          id: 'itv_02',
          vendaId: 'ven_01', // Relational FK -> Venda ven_01
          orderId: 'ven_01',
          productId: 'prod_01', // Relational FK -> Produto prod_01
          quantity: 2,
          unitPrice: 12.00,
          totalPrice: 24.00
        },
        {
          id: 'itv_03',
          vendaId: 'ven_02', // Relational FK -> Venda ven_02
          orderId: 'ven_02',
          productId: 'prod_02', // Relational FK -> Produto prod_02
          quantity: 2,
          unitPrice: 18.00,
          totalPrice: 36.00
        }
      ];
      await db.itensVenda.bulkPut(sampleItensVenda);
      await db.orderItems.bulkPut(sampleItensVenda);
    }

    // 7. Fluxo de Caixa (Entradas e Saídas)
    const fluxoCount = await db.fluxoDeCaixa.count();
    if (fluxoCount === 0) {
      const sampleFluxo: FluxoDeCaixa[] = [
        {
          id: 'flx_01',
          type: 'receita',
          category: 'Vendas de Cestas',
          description: 'Recebimento Venda #VEN-2026-001 - Maria Clara',
          amount: 185.00,
          status: 'pago',
          dueDate: '2026-07-27',
          paymentDate: '2026-07-27',
          vendaId: 'ven_01', // Relational FK -> Venda ven_01
          orderId: 'ven_01',
          paymentMethod: 'pix',
          createdAt: new Date().toISOString()
        },
        {
          id: 'flx_02',
          type: 'receita',
          category: 'Vendas de Cestas',
          description: 'Recebimento Venda #VEN-2026-002 - Roberto Carlos',
          amount: 200.00,
          status: 'pago',
          dueDate: '2026-07-27',
          paymentDate: '2026-07-27',
          vendaId: 'ven_02', // Relational FK -> Venda ven_02
          orderId: 'ven_02',
          paymentMethod: 'cartao_credito',
          createdAt: new Date().toISOString()
        },
        {
          id: 'flx_03',
          type: 'despesa',
          category: 'Compra de Insumos',
          description: 'Compra de frios, frutas e pães frescos na distribuidora',
          amount: 140.50,
          status: 'pago',
          dueDate: '2026-07-26',
          paymentDate: '2026-07-26',
          paymentMethod: 'pix',
          createdAt: new Date().toISOString()
        }
      ];
      await db.fluxoDeCaixa.bulkPut(sampleFluxo);
      await db.financialTransactions.bulkPut(sampleFluxo);
    }

    // 8. Pesquisa de Satisfação de Exemplo
    const pesquisaCount = await db.pesquisasSatisfacao.count();
    if (pesquisaCount === 0) {
      const samplePesquisas: PesquisaSatisfacao[] = [
        {
          id: 'pesq_01',
          vendaId: 'ven_01', // Relational FK -> Venda ven_01
          clientId: 'cli_01', // Relational FK -> Client cli_01
          rating: 5,
          deliveryRating: 5,
          productQualityRating: 5,
          feedback: 'A cesta superou todas as expectativas! Chegou no horário exato de 07:00 e o suco e produtos estavam muito frescos.',
          recommend: true,
          createdAt: new Date().toISOString()
        }
      ];
      await db.pesquisasSatisfacao.bulkPut(samplePesquisas);
    }

  } catch (error) {
    console.error('Erro ao inicializar o banco de dados Dexie:', error);
  }
}

