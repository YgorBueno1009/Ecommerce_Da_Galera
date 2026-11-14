import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { map } from 'rxjs';
import { MoedaPipe } from '../../../shared/formatacao/formatacao';
import { FRETE_GRATIS_A_PARTIR_DE } from '../../checkout/frete';
import { CartaoProduto } from '../cartao-produto/cartao-produto';
import { CatalogoService } from '../catalogo.service';
import { Produto } from '../produto.model';

/** Quantidade fixa de cards na seção Destaques. */
const DESTAQUES_NA_VITRINE = 8;

/** Busca a mais para compensar itens esgotados cortados pelo filtro de estoque. */
const LIMITE_CONSULTA_CATALOGO = 32;

@Component({
  selector: 'app-vitrine',
  imports: [RouterLink, CartaoProduto, MoedaPipe],
  templateUrl: './vitrine.html',
  styleUrls: ['../../../shared/estilos/loja.css', './vitrine.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Vitrine {
  protected readonly freteGratisAPartirDe = FRETE_GRATIS_A_PARTIR_DE;
  protected readonly destaques = signal<Produto[]>([]);
  protected readonly carregando = signal(true);
  protected readonly erro = signal(false);

  constructor() {
    inject(CatalogoService)
      .listar({ limit: LIMITE_CONSULTA_CATALOGO })
      .pipe(
        map((produtos) =>
          produtos.filter((produto) => produto.estoque > 0).slice(0, DESTAQUES_NA_VITRINE),
        ),
        takeUntilDestroyed(),
      )
      .subscribe({
        next: (destaques) => {
          this.destaques.set(destaques);
          this.carregando.set(false);
        },
        error: () => {
          this.erro.set(true);
          this.carregando.set(false);
        },
      });
  }
}
