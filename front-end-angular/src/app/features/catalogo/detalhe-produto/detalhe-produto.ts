import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { catchError, map, of, switchMap, tap } from 'rxjs';
import { Sessao } from '../../../core/sessao/sessao';
import { MoedaPipe } from '../../../shared/formatacao/formatacao';
import { CarrinhoService } from '../../checkout/carrinho/carrinho.service';
import { CatalogoService, trilhaDaCategoria } from '../catalogo.service';
import { aoErroImagemProduto, urlImagemProduto } from '../imagem-produto';
import { CaracteristicaProduto, Categoria, Produto } from '../produto.model';

function rotuloFicha(rotulo: string): string {
  return rotulo
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

@Component({
  selector: 'app-detalhe-produto',
  imports: [RouterLink, MoedaPipe],
  templateUrl: './detalhe-produto.html',
  styleUrls: ['../../../shared/estilos/loja.css', './detalhe-produto.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DetalheProduto {
  private readonly catalogo = inject(CatalogoService);
  private readonly carrinho = inject(CarrinhoService);
  private readonly router = inject(Router);
  private readonly sessao = inject(Sessao);
  private readonly descricaoTexto = viewChild<ElementRef<HTMLElement>>('descricaoTexto');
  private readonly colunaCompra = viewChild<ElementRef<HTMLElement>>('colunaCompra');
  private readonly galeriaRaiz = viewChild<ElementRef<HTMLElement>>('galeriaRaiz');

  protected readonly produto = signal<Produto | null>(null);
  protected readonly categorias = signal<Categoria[]>([]);
  protected readonly erroCategorias = signal(false);
  protected readonly carregando = signal(true);
  protected readonly quantidade = signal(1);

  protected readonly trilha = computed(() => {
    const produto = this.produto();
    return produto ? trilhaDaCategoria(produto.categoria, this.categorias()) : [];
  });

  protected readonly esgotado = computed(() => (this.produto()?.estoque ?? 0) === 0);

  protected readonly podeComprar = computed(
    () => this.sessao.logado() && this.sessao.contexto() === 'STORE',
  );

  /** Quanto ainda dá para pôr no carrinho, descontando o que já está lá. */
  protected readonly disponivel = computed(() => {
    const produto = this.produto();
    if (!produto) {
      return 0;
    }
    const noCarrinho =
      this.carrinho.itens().find((item) => item.produtoId === produto.id)?.quantidade ?? 0;
    return Math.max(produto.estoque - noCarrinho, 0);
  });

  protected readonly rotuloEstoque = computed(() => {
    const estoque = this.produto()?.estoque ?? 0;
    return `Em estoque · ${estoque} ${estoque === 1 ? 'disponível' : 'disponíveis'}`;
  });

  /** Texto de `ecommerce.products.description`, exposto pela API como `descricao`. */
  protected readonly descricaoExibida = computed(() => {
    const texto = this.produto()?.descricao?.trim();
    return texto ? texto : null;
  });

  protected readonly descricaoExpandida = signal(false);
  protected readonly alturaMaximaDescricaoPx = signal<number | null>(null);
  private readonly descricaoComOverflow = signal(false);

  /** Distância entre a foto e o card de descrição (ver `.galeria` no CSS). */
  private static readonly gapGaleriaDescricaoPx = 18;

  protected readonly modoDescricaoVisitante = computed(() => !this.sessao.logado());

  protected readonly mostrarAlternarDescricao = computed(
    () => this.descricaoComOverflow() || this.descricaoExpandida(),
  );

  protected readonly mostrarBotaoDescricao = computed(() => {
    if (this.modoDescricaoVisitante()) {
      return this.descricaoExibida() !== null;
    }
    return this.mostrarAlternarDescricao();
  });

  protected readonly rotuloBotaoDescricao = computed(() => {
    if (this.modoDescricaoVisitante()) {
      return this.descricaoExpandida() ? 'Fechar descrição' : 'Ver descrição';
    }
    return this.descricaoExpandida() ? 'Ver menos' : 'Ver descrição completa';
  });

  protected readonly fichaExibicao = computed(() => {
    const produto = this.produto();
    if (!produto) {
      return [] as CaracteristicaProduto[];
    }
    const rotulos = new Set(produto.fichaTecnica.map((item) => rotuloFicha(item.rotulo)));
    const extras: CaracteristicaProduto[] = [];
    const incluir = (rotulo: string, valor: string | null) => {
      if (!valor || rotulos.has(rotuloFicha(rotulo))) {
        return;
      }
      extras.push({ rotulo, valor });
      rotulos.add(rotuloFicha(rotulo));
    };
    incluir('Voltagem', produto.voltagem);
    incluir('Cor', produto.cor);
    incluir('Dimensões', produto.tamanho);
    return [...extras, ...produto.fichaTecnica];
  });

  protected imagemPrincipal(): string {
    const produto = this.produto();
    return produto ? urlImagemProduto(produto, 800, 800) : '';
  }

  protected readonly aoErroImagemProduto = aoErroImagemProduto;

  protected alternarDescricao(): void {
    this.descricaoExpandida.update((aberta) => !aberta);
    if (!this.descricaoExpandida()) {
      queueMicrotask(() => this.sincronizarLimiteDescricao());
    }
  }

  private medirDescricao(): void {
    if (this.modoDescricaoVisitante() || this.descricaoExpandida()) {
      return;
    }
    const elemento = this.descricaoTexto()?.nativeElement;
    if (!elemento) {
      return;
    }
    const ultrapassou = elemento.scrollHeight > elemento.clientHeight + 1;
    if (ultrapassou) {
      this.descricaoComOverflow.set(true);
    }
  }

  private reiniciarDescricao(): void {
    this.descricaoExpandida.set(false);
    this.descricaoComOverflow.set(false);
    this.alturaMaximaDescricaoPx.set(null);
  }

  /** A descrição preenche só o vazio até a base da coluna da ficha técnica. */
  private sincronizarLimiteDescricao(): void {
    if (this.modoDescricaoVisitante()) {
      this.alturaMaximaDescricaoPx.set(null);
      return;
    }
    if (this.descricaoExpandida()) {
      this.alturaMaximaDescricaoPx.set(null);
      return;
    }

    const compraEl = this.colunaCompra()?.nativeElement;
    const galeriaEl = this.galeriaRaiz()?.nativeElement;
    if (!compraEl || !galeriaEl) {
      this.alturaMaximaDescricaoPx.set(null);
      return;
    }

    const empilhado =
      Math.abs(compraEl.getBoundingClientRect().top - galeriaEl.getBoundingClientRect().top) > 4;
    if (empilhado) {
      this.alturaMaximaDescricaoPx.set(null);
      queueMicrotask(() => this.medirDescricao());
      return;
    }

    const imagemEl = galeriaEl.querySelector('.galeria__principal');
    if (!(imagemEl instanceof HTMLElement)) {
      return;
    }

    const limiteCard =
      compraEl.offsetHeight -
      imagemEl.offsetHeight -
      DetalheProduto.gapGaleriaDescricaoPx;
    const cabecalhoEl = galeriaEl.querySelector('.descricao__cabecalho');
    const tituloAltura = cabecalhoEl instanceof HTMLElement ? cabecalhoEl.offsetHeight : 0;
    const limiteCorpo = Math.max(limiteCard - tituloAltura, 0);
    this.alturaMaximaDescricaoPx.set(limiteCorpo);
    queueMicrotask(() => this.medirDescricao());
  }

  constructor() {
    effect(() => {
      this.sessao.logado();
      this.descricaoExibida();
      this.descricaoExpandida();
      this.fichaExibicao();
      this.produto();
      queueMicrotask(() => this.sincronizarLimiteDescricao());
    });

    effect((onCleanup) => {
      const alvos = [
        this.colunaCompra()?.nativeElement,
        this.galeriaRaiz()?.nativeElement,
        this.descricaoTexto()?.nativeElement,
      ].filter((elemento): elemento is HTMLElement => elemento instanceof HTMLElement);

      const observador = new ResizeObserver(() => this.sincronizarLimiteDescricao());
      for (const alvo of alvos) {
        observador.observe(alvo);
      }
      queueMicrotask(() => this.sincronizarLimiteDescricao());
      onCleanup(() => observador.disconnect());
    });

    this.catalogo
      .listarCategorias()
      .pipe(takeUntilDestroyed())
      .subscribe({
        next: (categorias) => this.categorias.set(categorias),
        error: () => this.erroCategorias.set(true),
      });

    inject(ActivatedRoute)
      .paramMap.pipe(
        map((params) => params.get('slug') ?? ''),
        tap(() => {
          this.carregando.set(true);
          this.quantidade.set(1);
          this.reiniciarDescricao();
        }),
        switchMap((slug) => this.catalogo.buscarPorSlug(slug).pipe(catchError(() => of(null)))),
        takeUntilDestroyed(),
      )
      .subscribe((produto) => {
        this.produto.set(produto);
        this.carregando.set(false);
      });
  }

  protected alterarQuantidade(delta: number): void {
    const maximo = Math.max(this.disponivel(), 1);
    this.quantidade.update((atual) => Math.min(Math.max(atual + delta, 1), maximo));
  }

  protected adicionar(): void {
    if (!this.podeComprar()) {
      return;
    }
    const produto = this.produto();
    if (!produto || this.disponivel() === 0) {
      return;
    }
    this.carrinho.adicionar(produto, Math.min(this.quantidade(), this.disponivel()));
    this.router.navigate(['/checkout/cart']);
  }
}
