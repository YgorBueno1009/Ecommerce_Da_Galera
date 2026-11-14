import { HttpClient } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  Subject,
  catchError,
  debounceTime,
  distinctUntilChanged,
  finalize,
  map,
  of,
  switchMap,
} from 'rxjs';
import {
  rotaContextoDisponivel,
  selecionarContextoSessao,
} from '../../core/sessao/contexto-sessao';
import { ContextoSessao, Sessao } from '../../core/sessao/sessao';
import { mensagemDeErro } from '../../features/autenticacao/acesso';
import { CarrinhoService } from '../../features/checkout/carrinho/carrinho.service';
import { CatalogoService } from '../../features/catalogo/catalogo.service';
import { Produto } from '../../features/catalogo/produto.model';
import { MoedaPipe } from '../../shared/formatacao/formatacao';

/** Cabeçalho da loja: marca, busca e ações da conta (protótipo Achei). */
@Component({
  selector: 'app-cabecalho',
  imports: [RouterLink, RouterLinkActive, MoedaPipe],
  templateUrl: './cabecalho.html',
  styleUrl: './cabecalho.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Cabecalho {
  private readonly http = inject(HttpClient);
  private readonly sessao = inject(Sessao);
  private readonly router = inject(Router);
  private readonly catalogo = inject(CatalogoService);
  private readonly termosSugestoes = new Subject<string>();

  protected readonly logado = this.sessao.logado;

  protected readonly primeiroNome = computed(
    () => this.sessao.usuario()?.fullName.trim().split(/\s+/)[0] ?? '',
  );

  protected readonly ehAdministrador = computed(() => this.sessao.usuario()?.role === 'ADMIN');

  protected readonly contextoAtual = this.sessao.contexto;

  protected readonly mostrarIrParaAdmin = computed(
    () => this.ehAdministrador() && this.contextoAtual() !== 'ADMIN',
  );

  protected readonly mostrarVoltarParaLoja = computed(
    () => this.ehAdministrador() && this.contextoAtual() === 'ADMIN',
  );

  /** Carrinho só na loja com perfil de cliente (contexto STORE). */
  protected readonly mostrarCarrinho = computed(() => this.contextoAtual() === 'STORE');

  protected readonly itensCarrinho = inject(CarrinhoService).quantidadeItens;

  protected readonly rotuloCarrinho = computed(() => {
    const total = this.itensCarrinho();
    return `Carrinho, ${total} ${total === 1 ? 'item' : 'itens'}`;
  });

  protected readonly saindo = signal(false);
  protected readonly trocandoContexto = signal<ContextoSessao | null>(null);
  protected readonly avisoContexto = signal<string | null>(null);
  protected readonly erroContexto = signal<string | null>(null);
  protected readonly sugestoes = signal<Produto[]>([]);
  protected readonly mostrarSugestoes = signal(false);
  protected readonly carregandoSugestoes = signal(false);
  protected readonly erroSugestoes = signal(false);
  protected readonly indiceSugestaoAtiva = signal(-1);
  protected readonly idSugestaoAtiva = computed(() => {
    const produto = this.sugestoes()[this.indiceSugestaoAtiva()];
    return produto ? `sugestao-produto-${produto.id}` : null;
  });

  constructor() {
    this.termosSugestoes
      .pipe(
        debounceTime(200),
        distinctUntilChanged(),
        switchMap((termo) => {
          if (termo.length < 2) {
            this.sugestoes.set([]);
            this.carregandoSugestoes.set(false);
            this.erroSugestoes.set(false);
            return of([]);
          }

          this.carregandoSugestoes.set(true);
          this.erroSugestoes.set(false);
          return this.catalogo.listar({ q: termo, limit: 5 }).pipe(
            map((produtos) => produtos.slice(0, 5)),
            catchError(() => {
              this.erroSugestoes.set(true);
              return of([]);
            }),
            finalize(() => this.carregandoSugestoes.set(false)),
          );
        }),
        takeUntilDestroyed(),
      )
      .subscribe((produtos) => this.sugestoes.set(produtos));
  }

  protected atualizarSugestoes(termo: string): void {
    const consulta = termo.trim();
    this.mostrarSugestoes.set(consulta.length >= 2);
    this.indiceSugestaoAtiva.set(-1);
    this.termosSugestoes.next(consulta);
  }

  protected navegarSugestoes(evento: KeyboardEvent): void {
    if (evento.key === 'Escape' && this.mostrarSugestoes()) {
      evento.preventDefault();
      this.selecionarSugestao();
      return;
    }

    const total = this.sugestoes().length;
    if (!this.mostrarSugestoes() || total === 0) {
      return;
    }

    if (evento.key === 'ArrowDown') {
      evento.preventDefault();
      this.indiceSugestaoAtiva.update((indice) => (indice + 1) % total);
    } else if (evento.key === 'ArrowUp') {
      evento.preventDefault();
      this.indiceSugestaoAtiva.update((indice) => (indice <= 0 ? total - 1 : indice - 1));
    } else if (evento.key === 'Enter' && this.indiceSugestaoAtiva() >= 0) {
      evento.preventDefault();
      const produto = this.sugestoes()[this.indiceSugestaoAtiva()];
      if (produto) {
        this.selecionarSugestao();
        void this.router.navigate(['/catalog/product', produto.slug]);
      }
    }
  }

  protected fecharSugestoesAoSair(evento: FocusEvent): void {
    const destino = evento.relatedTarget;
    if (destino instanceof Node && evento.currentTarget instanceof HTMLElement) {
      if (evento.currentTarget.contains(destino)) {
        return;
      }
    }
    this.selecionarSugestao();
  }

  protected selecionarSugestao(): void {
    this.mostrarSugestoes.set(false);
    this.indiceSugestaoAtiva.set(-1);
  }

  protected buscar(evento: Event, termo: string): void {
    evento.preventDefault();
    const q = termo.trim();
    this.selecionarSugestao();
    this.router.navigate(['/catalog/search'], { queryParams: q ? { q } : {} });
  }

  protected sair(): void {
    if (this.saindo()) {
      return;
    }
    this.saindo.set(true);
    this.sessao.sair().subscribe(() => {
      this.saindo.set(false);
      void this.router.navigate(['/catalog/home']);
    });
  }

  protected trocarContexto(contexto: ContextoSessao): void {
    if (this.trocandoContexto() || !this.sessao.token()) {
      return;
    }
    this.trocandoContexto.set(contexto);
    this.erroContexto.set(null);
    this.avisoContexto.set(null);

    selecionarContextoSessao(this.http, this.sessao, contexto).subscribe({
      next: ({ redirectTo }) => {
        this.trocandoContexto.set(null);
        if (rotaContextoDisponivel(redirectTo)) {
          void this.router.navigateByUrl(redirectTo);
        } else {
          // TODO: navegar para redirectTo quando as telas do painel existirem.
          this.avisoContexto.set(
            'Você entrou no painel, mas as telas administrativas ainda não existem.',
          );
        }
      },
      error: (erro: unknown) => {
        this.trocandoContexto.set(null);
        this.erroContexto.set(mensagemDeErro(erro, 'Não foi possível trocar o perfil.'));
      },
    });
  }
}
