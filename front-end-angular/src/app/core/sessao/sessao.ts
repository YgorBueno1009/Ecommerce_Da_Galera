import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, catchError, map, of } from 'rxjs';

export interface UsuarioSessao {
  id: string;
  fullName: string;
  email: string;
  role: 'CLIENTE' | 'ADMIN';
}

export type ContextoSessao = 'STORE' | 'ADMIN';

interface SessaoSalva {
  token: string;
  usuario: UsuarioSessao;
}

const CHAVE_ARMAZENAMENTO = 'ecommerce.sessao';

/**
 * Sessão do usuário logado: token JWT do Node + dados básicos do usuário.
 * Guardada no localStorage para sobreviver ao recarregar a página.
 * Cadastro e login chamam `iniciar`; o logout deve chamar `encerrar`.
 */
@Injectable({ providedIn: 'root' })
export class Sessao {
  private readonly http = inject(HttpClient);
  private readonly sessao = signal<SessaoSalva | null>(lerSessaoSalva());

  readonly usuario = computed(() => this.sessao()?.usuario ?? null);
  readonly token = computed(() => this.sessao()?.token ?? null);
  readonly contexto = computed(() => obterContexto(this.sessao()?.token ?? null));
  readonly logado = computed(() => this.sessao() !== null);

  iniciar(token: string, usuario: UsuarioSessao): void {
    const sessao = { token, usuario };
    this.sessao.set(sessao);
    try {
      localStorage.setItem(CHAVE_ARMAZENAMENTO, JSON.stringify(sessao));
    } catch {
      // Navegação privada/armazenamento bloqueado: a sessão vale só nesta aba.
    }
  }

  /**
   * Logout: avisa o Node (`POST /auth/logout` põe o jti na deny-list) e limpa a
   * sessão local mesmo se a chamada falhar (sem rede, token já vencido...).
   */
  sair(): Observable<void> {
    const token = this.token();
    this.encerrar();
    if (!token) {
      return of(undefined);
    }
    return this.http
      .post('/auth/logout', null, { headers: { Authorization: `Bearer ${token}` } })
      .pipe(
        map(() => undefined),
        catchError(() => of(undefined)),
      );
  }

  encerrar(): void {
    this.sessao.set(null);
    try {
      localStorage.removeItem(CHAVE_ARMAZENAMENTO);
    } catch {
      // Ignorado pelo mesmo motivo acima.
    }
  }
}

function lerSessaoSalva(): SessaoSalva | null {
  try {
    const bruto = localStorage.getItem(CHAVE_ARMAZENAMENTO);
    if (!bruto) {
      return null;
    }
    const sessao = JSON.parse(bruto) as Partial<SessaoSalva>;
    if (!sessao.token || !sessao.usuario?.fullName || tokenExpirado(sessao.token)) {
      return null;
    }
    return sessao as SessaoSalva;
  } catch {
    return null;
  }
}

/** Lê o `exp` do JWT só para descartar sessão vencida (a validação real é no back). */
function tokenExpirado(token: string): boolean {
  const payload = lerPayload(token);
  return !payload || typeof payload['exp'] !== 'number' || payload['exp'] * 1000 <= Date.now();
}

function obterContexto(token: string | null): ContextoSessao | null {
  if (!token) {
    return null;
  }
  const payload = lerPayload(token);
  return payload?.['context'] === 'STORE' || payload?.['context'] === 'ADMIN'
    ? payload['context']
    : null;
}

function lerPayload(token: string): Record<string, unknown> | null {
  try {
    const encoded = token.split('.')[1];
    if (!encoded) {
      return null;
    }
    return JSON.parse(atob(encoded.replace(/-/g, '+').replace(/_/g, '/'))) as Record<
      string,
      unknown
    >;
  } catch {
    return null;
  }
}
