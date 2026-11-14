/** Espelha `ecommerce.categories` (slug em minúsculas e hífen). */
export interface Categoria {
  slug: string;
  nome: string;
  /** Slug da categoria pai; ausente nas categorias raiz. */
  pai?: string;
}

export interface CaracteristicaProduto {
  rotulo: string;
  valor: string;
}

/** Espelha `ecommerce.products` + o estoque disponível. */
export interface Produto {
  id: string;
  slug: string;
  nome: string;
  sku: string;
  /** Coluna `description` em `ecommerce.products`. */
  descricao?: string | null;
  preco: number;
  categoria: string;
  oferta: boolean;
  estoque: number;
  voltagem: string | null;
  cor: string | null;
  tamanho: string | null;
  fichaTecnica: CaracteristicaProduto[];
  /** Opcional: `attributes.imagemUrl` no Postgres; ausente usa placeholder automático. */
  imagemUrl?: string | null;
}
