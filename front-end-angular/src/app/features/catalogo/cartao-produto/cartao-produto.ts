import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MoedaPipe } from '../../../shared/formatacao/formatacao';
import { aoErroImagemProduto, urlImagemProduto } from '../imagem-produto';
import { Produto } from '../produto.model';

/** Card de produto da vitrine e da busca; leva ao detalhe pelo slug. */
@Component({
  selector: 'app-cartao-produto',
  imports: [RouterLink, MoedaPipe],
  templateUrl: './cartao-produto.html',
  styleUrl: './cartao-produto.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CartaoProduto {
  readonly produto = input.required<Produto>();

  protected imagemDoCard(): string {
    return urlImagemProduto(this.produto(), 480, 360);
  }

  protected aoErroImagem(evento: Event): void {
    aoErroImagemProduto(evento);
  }
}
