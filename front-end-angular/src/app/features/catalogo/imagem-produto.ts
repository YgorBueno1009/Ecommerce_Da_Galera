import type { Produto } from './produto.model';

/** Dados mínimos para montar a URL da foto do produto. */
export type ProdutoComImagem = Pick<Produto, 'slug' | 'imagemUrl'>;

/** Fallback local quando a URL do banco falha ou ainda não foi configurada. */
export const IMAGEM_PRODUTO_PLACEHOLDER = '/imagens/produto-sem-foto.svg';

/**
 * URL da imagem do produto (`attributes.imagemUrl` no Postgres).
 * Sem URL válida, usa placeholder estático servido pelo Angular (sem depender de CDN externo).
 */
export function urlImagemProduto(
  produto: ProdutoComImagem,
  _largura = 640,
  _altura = 480,
): string {
  const personalizada = produto.imagemUrl?.trim();
  if (personalizada) {
    return personalizada;
  }
  return IMAGEM_PRODUTO_PLACEHOLDER;
}

export function aoErroImagemProduto(evento: Event): void {
  const imagem = evento.target;
  if (!(imagem instanceof HTMLImageElement)) {
    return;
  }
  const placeholder = new URL(IMAGEM_PRODUTO_PLACEHOLDER, window.location.origin).href;
  if (imagem.src === placeholder) {
    return;
  }
  imagem.src = IMAGEM_PRODUTO_PLACEHOLDER;
}