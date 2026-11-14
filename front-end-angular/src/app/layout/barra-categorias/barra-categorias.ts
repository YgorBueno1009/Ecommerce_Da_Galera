import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { CatalogoService } from '../../features/catalogo/catalogo.service';
import { Categoria } from '../../features/catalogo/produto.model';

/**
 * Barra de atalhos de categoria abaixo do cabeçalho (protótipo Achei).
 *
 * As categorias são carregadas do catálogo do servidor.
 */
@Component({
  selector: 'app-barra-categorias',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './barra-categorias.html',
  styleUrl: './barra-categorias.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BarraCategorias {
  protected readonly categorias = signal<Categoria[]>([]);
  protected readonly erro = signal(false);

  constructor() {
    inject(CatalogoService)
      .listarCategorias()
      .pipe(takeUntilDestroyed())
      .subscribe({
        next: (categorias) => this.categorias.set(categorias),
        error: () => this.erro.set(true),
      });
  }
}
