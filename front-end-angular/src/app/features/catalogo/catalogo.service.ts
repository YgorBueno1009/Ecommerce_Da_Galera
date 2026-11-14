import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { Categoria, Produto } from './produto.model';

export interface FiltrosCatalogo {
  q?: string;
  category?: string;
  voltage?: string[];
  color?: string[];
  size?: string[];
  sort?: 'relevance' | 'price-asc' | 'price-desc';
  limit?: number;
  offset?: number;
}

@Injectable({ providedIn: 'root' })
export class CatalogoService {
  private readonly http = inject(HttpClient);

  listar(filtros: FiltrosCatalogo = {}): Observable<Produto[]> {
    let params = new HttpParams();
    for (const [chave, valor] of Object.entries(filtros)) {
      if (Array.isArray(valor)) {
        for (const item of valor) {
          params = params.append(chave, item);
        }
      } else if (valor !== undefined && valor !== '') {
        params = params.set(chave, String(valor));
      }
    }

    return this.http.get<Produto[]>('/catalog/products', { params });
  }

  listarCategorias(): Observable<Categoria[]> {
    return this.http.get<Categoria[]>('/catalog/categories');
  }

  buscarPorSlug(slug: string): Observable<Produto> {
    return this.http.get<Produto>(`/catalog/products/${encodeURIComponent(slug)}`);
  }
}

export function buscarCategoria(
  slug: string | null | undefined,
  categorias: readonly Categoria[],
): Categoria | undefined {
  return categorias.find((categoria) => categoria.slug === slug);
}

/** Retorna uma categoria e todos os seus descendentes. */
export function slugsDaCategoria(slug: string, categorias: readonly Categoria[]): string[] {
  const slugs = new Set([slug]);
  let mudou = true;
  while (mudou) {
    mudou = false;
    for (const categoria of categorias) {
      if (categoria.pai && slugs.has(categoria.pai) && !slugs.has(categoria.slug)) {
        slugs.add(categoria.slug);
        mudou = true;
      }
    }
  }
  return [...slugs];
}

/** Início › Pai › Categoria, para a trilha do detalhe do produto. */
export function trilhaDaCategoria(slug: string, categorias: readonly Categoria[]): Categoria[] {
  const trilha: Categoria[] = [];
  const visitadas = new Set<string>();
  let atual = buscarCategoria(slug, categorias);
  while (atual && !visitadas.has(atual.slug)) {
    visitadas.add(atual.slug);
    trilha.unshift(atual);
    atual = buscarCategoria(atual.pai, categorias);
  }
  return trilha;
}
