import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter, map, startWith } from 'rxjs';
import { BarraCategorias } from '../barra-categorias/barra-categorias';
import { Cabecalho } from '../cabecalho/cabecalho';

@Component({
  selector: 'app-principal',
  imports: [RouterOutlet, Cabecalho, BarraCategorias],
  templateUrl: './principal.html',
  styleUrl: './principal.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Principal {
  private readonly router = inject(Router);

  protected readonly mostrarBarraCategorias = toSignal(
    this.router.events.pipe(
      filter((evento) => evento instanceof NavigationEnd),
      map(() => !this.router.url.includes('/checkout/cart')),
      startWith(!this.router.url.includes('/checkout/cart')),
    ),
    { initialValue: !this.router.url.includes('/checkout/cart') },
  );
}
