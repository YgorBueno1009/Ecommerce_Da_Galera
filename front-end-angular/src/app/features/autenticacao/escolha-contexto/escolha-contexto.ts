import { HttpClient } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import {
  rotaContextoDisponivel,
  selecionarContextoSessao,
} from '../../../core/sessao/contexto-sessao';
import { ContextoSessao, Sessao } from '../../../core/sessao/sessao';
import { mensagemDeErro } from '../acesso';

@Component({
  selector: 'app-escolha-contexto',
  templateUrl: './escolha-contexto.html',
  styleUrls: ['../acesso.css', './escolha-contexto.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EscolhaContexto {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly sessao = inject(Sessao);

  protected readonly primeiroNome = computed(
    () => this.sessao.usuario()?.fullName.trim().split(/\s+/)[0] ?? '',
  );
  protected readonly enviando = signal<ContextoSessao | null>(null);
  protected readonly erro = signal<string | null>(null);
  protected readonly aviso = signal<string | null>(null);

  constructor() {
    // Só administradores escolhem contexto (o Node responde 403 para clientes).
    const usuario = this.sessao.usuario();
    if (!usuario) {
      this.router.navigate(['/auth/login']);
    } else if (usuario.role !== 'ADMIN') {
      this.router.navigate(['/catalog/home']);
    }
  }

  protected escolher(contexto: ContextoSessao): void {
    if (this.enviando() || !this.sessao.token()) {
      return;
    }
    this.enviando.set(contexto);
    this.erro.set(null);
    this.aviso.set(null);

    selecionarContextoSessao(this.http, this.sessao, contexto).subscribe({
      next: ({ redirectTo }) => {
        this.enviando.set(null);
        if (rotaContextoDisponivel(redirectTo)) {
          this.router.navigateByUrl(redirectTo);
        } else {
          // TODO: navegar para redirectTo quando as telas do painel existirem.
          this.aviso.set('Você entrou no painel, mas as telas administrativas ainda não existem.');
        }
      },
      error: (erro: unknown) => {
        this.enviando.set(null);
        this.erro.set(mensagemDeErro(erro, 'Não foi possível escolher o contexto.'));
      },
    });
  }

  protected sair(): void {
    this.sessao.sair().subscribe(() => void this.router.navigate(['/catalog/home']));
  }
}
