import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { Observable, catchError, concatMap, from, map, of, switchMap, toArray } from 'rxjs';
import { Sessao } from '../../../core/sessao/sessao';
import { Produto } from '../../catalogo/produto.model';

export interface ItemCarrinho {
  produtoId: string;
  slug: string;
  nome: string;
  sku: string;
  imagemUrl?: string | null;
  precoUnitario: number;
  quantidade: number;
  estoque: number;
}

interface RespostaCarrinho {
  itens: ItemCarrinho[];
  quantidadeItens: number;
  subtotal: number;
}

const CHAVE_ARMAZENAMENTO = 'ecommerce.carrinho';

/** Mantém o carrinho local para visitantes e sincroniza o carrinho autenticado com o Node. */
@Injectable({ providedIn: 'root' })
export class CarrinhoService {
  private readonly http = inject(HttpClient);
  private readonly sessao = inject(Sessao);
  private usuarioObservado = this.sessao.usuario()?.id ?? null;
  private tokenObservado = this.sessao.token();
  private contextoObservado = this.sessao.contexto();
  private carrinhoServidor = false;
  private efeitoInicializado = false;
  private readonly estado = signal<ItemCarrinho[]>(
    this.sessao.token() && this.sessao.contexto() === 'STORE' ? [] : lerCarrinhoSalvo(),
  );
  private readonly carregandoEstado = signal(
    !!this.sessao.token() && this.sessao.contexto() === 'STORE',
  );
  private readonly erroEstado = signal<string | null>(null);

  readonly itens = this.estado.asReadonly();
  readonly carregando = this.carregandoEstado.asReadonly();
  readonly erro = this.erroEstado.asReadonly();
  readonly quantidadeItens = computed(() =>
    this.estado().reduce((soma, item) => soma + item.quantidade, 0),
  );
  readonly subtotal = computed(() =>
    arredondar(
      this.estado().reduce((soma, item) => soma + item.precoUnitario * item.quantidade, 0),
    ),
  );
  readonly vazio = computed(() => this.estado().length === 0);

  constructor() {
    const token = this.tokenDaLoja();
    if (token) {
      this.carregarRemoto(token);
    }

    effect(() => {
      const tokenAtual = this.sessao.token();
      const contextoAtual = this.sessao.contexto();
      const usuarioAtual = this.sessao.usuario()?.id ?? null;
      if (!this.efeitoInicializado) {
        this.efeitoInicializado = true;
        return;
      }

      if (tokenAtual === this.tokenObservado && contextoAtual === this.contextoObservado) {
        return;
      }

      const mudouUsuario =
        usuarioAtual !== null &&
        this.usuarioObservado !== null &&
        usuarioAtual !== this.usuarioObservado;
      const itensVisitante =
        contextoAtual === 'STORE' && !this.carrinhoServidor && !mudouUsuario ? this.estado() : [];
      if (mudouUsuario) {
        this.estado.set([]);
        removerCarrinhoSalvo();
      }
      this.usuarioObservado = usuarioAtual;
      this.tokenObservado = tokenAtual;
      this.contextoObservado = contextoAtual;

      if (tokenAtual && usuarioAtual && contextoAtual === 'STORE') {
        this.carregarRemoto(tokenAtual, itensVisitante);
      } else if (!tokenAtual) {
        this.estado.set([]);
        this.carregandoEstado.set(false);
        this.erroEstado.set(null);
        this.carrinhoServidor = false;
        removerCarrinhoSalvo();
      } else {
        this.carregandoEstado.set(false);
      }
    });
  }

  adicionar(produto: Produto, quantidade: number): void {
    const atual = this.estado();
    const existente = atual.find((item) => item.produtoId === produto.id);
    const quantidadeAtual = existente?.quantidade ?? 0;
    const proximaQuantidade = Math.min(
      Math.max(Math.floor(quantidadeAtual + quantidade), 0),
      produto.estoque,
    );
    const incremento = proximaQuantidade - quantidadeAtual;
    if (incremento <= 0) {
      return;
    }

    const itens = existente
      ? atual.map((item) =>
          item.produtoId === produto.id
            ? {
                ...item,
                quantidade: proximaQuantidade,
                estoque: produto.estoque,
                imagemUrl: produto.imagemUrl ?? item.imagemUrl ?? null,
              }
            : item,
        )
      : [
          ...atual,
          {
            produtoId: produto.id,
            slug: produto.slug,
            nome: produto.nome,
            sku: produto.sku,
            imagemUrl: produto.imagemUrl ?? null,
            precoUnitario: produto.preco,
            quantidade: proximaQuantidade,
            estoque: produto.estoque,
          },
        ];
    this.salvar(itens);

    const token = this.tokenDaLoja();
    if (token) {
      this.sincronizarMutacao(
        this.http.post(
          '/cart/items',
          { productId: produto.id, quantity: incremento },
          { headers: this.headers(token) },
        ),
        token,
      );
    }
  }

  alterarQuantidade(produtoId: string, quantidade: number): void {
    const item = this.estado().find((atual) => atual.produtoId === produtoId);
    if (!item) {
      return;
    }
    if (item.estoque < 1) {
      this.erroEstado.set('Este produto está sem estoque. Remova-o do carrinho para continuar.');
      return;
    }

    const proximaQuantidade = limitar(quantidade, item.estoque);
    this.salvar(
      this.estado().map((atual) =>
        atual.produtoId === produtoId ? { ...atual, quantidade: proximaQuantidade } : atual,
      ),
    );

    const token = this.tokenDaLoja();
    if (token) {
      this.sincronizarMutacao(
        this.http.patch(
          `/cart/items/${encodeURIComponent(produtoId)}`,
          { quantity: proximaQuantidade },
          { headers: this.headers(token) },
        ),
        token,
      );
    }
  }

  remover(produtoId: string): void {
    this.salvar(this.estado().filter((item) => item.produtoId !== produtoId));
    const token = this.tokenDaLoja();
    if (token) {
      this.sincronizarMutacao(
        this.http.delete(`/cart/items/${encodeURIComponent(produtoId)}`, {
          headers: this.headers(token),
        }),
        token,
      );
    }
  }

  limpar(): void {
    this.salvar([]);
    const token = this.tokenDaLoja();
    if (token) {
      this.sincronizarMutacao(this.http.delete('/cart', { headers: this.headers(token) }), token);
    }
  }

  private carregarRemoto(token: string, itensVisitante: ItemCarrinho[] = []): void {
    this.carregandoEstado.set(true);
    this.erroEstado.set(null);

    const falhasDeImportacao: ItemCarrinho[] = [];
    const importarItens =
      itensVisitante.length > 0
        ? from(itensVisitante).pipe(
            concatMap((item) =>
              this.resolverIdProduto(item).pipe(
                switchMap((productId) =>
                  this.http.post(
                    '/cart/items',
                    { productId, quantity: item.quantidade },
                    { headers: this.headers(token) },
                  ),
                ),
                catchError(() => {
                  falhasDeImportacao.push(item);
                  return of(null);
                }),
              ),
            ),
            toArray(),
            switchMap(() => this.obterCarrinho(token)),
          )
        : this.obterCarrinho(token);

    importarItens.subscribe({
      next: (resposta) => {
        if (this.tokenDaLoja() !== token) {
          return;
        }
        this.estado.set(resposta.itens);
        this.carregandoEstado.set(false);
        this.carrinhoServidor = true;
        removerCarrinhoSalvo();
        if (falhasDeImportacao.length > 0) {
          this.erroEstado.set(
            `Não foi possível sincronizar ${falhasDeImportacao.length} item(ns) do carrinho. Confira o estoque e tente adicioná-los novamente.`,
          );
        }
      },
      error: (error: unknown) => {
        if (this.tokenDaLoja() !== token) {
          return;
        }
        this.carregandoEstado.set(false);
        this.erroEstado.set(
          mensagemDeErro(error, 'Não foi possível carregar o carrinho do servidor.'),
        );
      },
    });
  }

  private sincronizarMutacao(request: Observable<unknown>, token: string): void {
    this.erroEstado.set(null);
    request.pipe(switchMap(() => this.obterCarrinho(token))).subscribe({
      next: (resposta) => {
        if (this.tokenDaLoja() !== token) {
          return;
        }
        this.estado.set(resposta.itens);
        this.carrinhoServidor = true;
      },
      error: (error: unknown) => {
        if (this.tokenDaLoja() !== token) {
          return;
        }
        const mensagem = mensagemDeErro(
          error,
          'Não foi possível atualizar o carrinho no servidor.',
        );
        this.carregarRemoto(token);
        this.erroEstado.set(mensagem);
      },
    });
  }

  private obterCarrinho(token: string): Observable<RespostaCarrinho> {
    return this.http.get<RespostaCarrinho>('/cart', {
      headers: this.headers(token),
    });
  }

  private resolverIdProduto(item: ItemCarrinho): Observable<string> {
    if (isUuid(item.produtoId)) {
      return of(item.produtoId);
    }
    return this.http
      .get<Produto>(`/catalog/products/${encodeURIComponent(item.slug)}`)
      .pipe(map((produto) => produto.id));
  }

  private headers(token: string): HttpHeaders {
    return new HttpHeaders({ Authorization: `Bearer ${token}` });
  }

  private tokenDaLoja(): string | null {
    return this.sessao.contexto() === 'STORE' ? this.sessao.token() : null;
  }

  private salvar(itens: ItemCarrinho[]): void {
    this.estado.set(itens);
    if (!this.tokenDaLoja()) {
      try {
        localStorage.setItem(CHAVE_ARMAZENAMENTO, JSON.stringify(itens));
      } catch {
        // O carrinho de visitante vale enquanto a aba estiver aberta.
      }
    }
  }
}

function limitar(quantidade: number, estoque: number): number {
  return Math.max(1, Math.min(Math.floor(quantidade), estoque));
}

function arredondar(valor: number): number {
  return Math.round(valor * 100) / 100;
}

function lerCarrinhoSalvo(): ItemCarrinho[] {
  try {
    const salvo = JSON.parse(localStorage.getItem(CHAVE_ARMAZENAMENTO) ?? '[]');
    return Array.isArray(salvo) ? (salvo as ItemCarrinho[]) : [];
  } catch {
    return [];
  }
}

function removerCarrinhoSalvo(): void {
  try {
    localStorage.removeItem(CHAVE_ARMAZENAMENTO);
  } catch {
    // O carrinho de visitante permanece apenas na memória.
  }
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function mensagemDeErro(error: unknown, fallback: string): string {
  if (
    error instanceof HttpErrorResponse &&
    typeof error.error === 'object' &&
    error.error !== null &&
    'error' in error.error &&
    typeof error.error.error === 'string'
  ) {
    return error.error.error;
  }
  return fallback;
}
