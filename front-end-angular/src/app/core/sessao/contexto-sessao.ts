import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { RespostaSessao } from '../../features/autenticacao/acesso';
import { ContextoSessao, Sessao } from './sessao';

/** Rotas que já existem no Angular; o painel admin ainda não tem tela. */
export const ROTAS_CONTEXTO_PRONTAS: readonly string[] = ['/catalog/home'];

export function rotaContextoDisponivel(redirectTo: string): boolean {
  return ROTAS_CONTEXTO_PRONTAS.includes(redirectTo);
}

export function selecionarContextoSessao(
  http: HttpClient,
  sessao: Sessao,
  contexto: ContextoSessao,
): Observable<RespostaSessao> {
  const token = sessao.token();
  if (!token) {
    throw new Error('Sessão ausente');
  }
  return http
    .post<RespostaSessao>(
      '/auth/context',
      { context: contexto },
      { headers: { Authorization: `Bearer ${token}` } },
    )
    .pipe(tap(({ token: novoToken, user }) => sessao.iniciar(novoToken, user)));
}
