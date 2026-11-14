/** Espelha `ecommerce.order_status` do schema.db. */
export type StatusPedido =
  'PENDING' | 'PAID' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELED' | 'REFUNDED';

/** Espelha `ecommerce.payment_method`. */
export type MetodoPagamento = 'PIX' | 'CREDIT_CARD' | 'BOLETO';

/** Espelha `ecommerce.payment_status`. */
export type StatusPagamento = 'PENDING' | 'APPROVED' | 'REFUSED' | 'REFUNDED' | 'CHARGEBACK';

/** Snapshot do endereço gravado no pedido (`orders.shipping_address_snapshot`). */
export interface EnderecoEntrega {
  apelido?: string;
  cep: string;
  rua: string;
  numero: string;
  complemento?: string;
  bairro: string;
  cidade: string;
  uf: string;
}

export interface ItemPedido {
  produtoId: string;
  nome: string;
  sku: string;
  quantidade: number;
  precoUnitario: number;
  /** Snapshot do checkout; pedidos antigos podem vir só com sku. */
  slug?: string;
  imagemUrl?: string | null;
}

export interface EventoStatus {
  status: StatusPedido;
  em: string;
}

export interface PagamentoPedido {
  metodo: MetodoPagamento;
  status: StatusPagamento;
}

export interface ItemResumoPedido {
  produtoId: string;
  nome: string;
  quantidade: number;
}

export interface ResumoPedido {
  id: string;
  criadoEm: string;
  status: StatusPedido;
  quantidadeItens: number;
  total: number;
  /** Para o cliente reconhecer o pedido pelo que comprou, não só pelo código. */
  itens: ItemResumoPedido[];
}

export interface Pedido {
  id: string;
  criadoEm: string;
  status: StatusPedido;
  subtotal: number;
  frete: number;
  total: number;
  itens: ItemPedido[];
  endereco: EnderecoEntrega;
  pagamento: PagamentoPedido;
  /** Quando cada status foi atingido; pode vir incompleto. */
  historico: EventoStatus[];
}

/** Máquina de estados única do SRS (seção 4). CANCELED/REFUNDED ficam fora da linha. */
export const ETAPAS_PEDIDO: readonly StatusPedido[] = [
  'PENDING',
  'PAID',
  'PROCESSING',
  'SHIPPED',
  'DELIVERED',
];

export const ROTULO_STATUS_PEDIDO: Record<StatusPedido, string> = {
  PENDING: 'Aguardando pagamento',
  PAID: 'Pago',
  PROCESSING: 'Em separação',
  SHIPPED: 'Enviado',
  DELIVERED: 'Entregue',
  CANCELED: 'Cancelado',
  REFUNDED: 'Estornado',
};

export const ROTULO_METODO_PAGAMENTO: Record<MetodoPagamento, string> = {
  PIX: 'PIX',
  CREDIT_CARD: 'Cartão de crédito',
  BOLETO: 'Boleto',
};

export const ROTULO_STATUS_PAGAMENTO: Record<StatusPagamento, string> = {
  PENDING: 'pendente',
  APPROVED: 'aprovado',
  REFUSED: 'recusado',
  REFUNDED: 'estornado',
  CHARGEBACK: 'contestado',
};

/** O id do pedido é UUID; na tela mostramos um código curto. */
export function codigoPedido(id: string): string {
  return `#${id.slice(0, 8).toUpperCase()}`;
}
