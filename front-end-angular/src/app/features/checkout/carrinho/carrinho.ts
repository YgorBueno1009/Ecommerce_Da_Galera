import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { Sessao } from '../../../core/sessao/sessao';
import { EtapasCheckout } from '../../../shared/etapas-checkout/etapas-checkout';
import { MoedaPipe } from '../../../shared/formatacao/formatacao';
import { ResumoCompra } from '../resumo-compra/resumo-compra';
import { aoErroImagemProduto, urlImagemProduto } from '../../catalogo/imagem-produto';
import { CarrinhoService, ItemCarrinho } from './carrinho.service';

@Component({
  selector: 'app-carrinho',
  imports: [RouterLink, EtapasCheckout, ResumoCompra, MoedaPipe],
  templateUrl: './carrinho.html',
  styleUrls: ['../../../shared/estilos/loja.css', './carrinho.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Carrinho {
  private readonly sessao = inject(Sessao);
  private readonly router = inject(Router);
  protected readonly carrinho = inject(CarrinhoService);

  protected alterar(item: ItemCarrinho, delta: number): void {
    this.carrinho.alterarQuantidade(item.produtoId, item.quantidade + delta);
  }

  protected remover(item: ItemCarrinho): void {
    this.carrinho.remover(item.produtoId);
  }

  protected imagemItem(item: ItemCarrinho): string {
    return urlImagemProduto({ slug: item.slug, imagemUrl: item.imagemUrl }, 160, 160);
  }

  protected readonly aoErroImagemProduto = aoErroImagemProduto;

  /** Sem login, entra primeiro e volta direto para a entrega. */
  protected continuar(): void {
    if (this.carrinho.carregando() || this.carrinho.erro()) {
      return;
    }

    const destino = '/checkout/address';
    if (this.sessao.logado()) {
      this.router.navigateByUrl(destino);
      return;
    }
    this.router.navigate(['/auth/login'], { queryParams: { retorno: destino } });
  }
}
