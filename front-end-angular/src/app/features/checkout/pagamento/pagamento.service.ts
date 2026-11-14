import { Injectable, inject } from '@angular/core';
import { Observable, defer, delay, of, throwError } from 'rxjs';
import { EnderecoEntrega, MetodoPagamento, Pedido, StatusPedido } from '../../pedidos/pedido.model';
import { PedidosService } from '../../pedidos/pedidos.service';
import { CarrinhoService } from '../carrinho/carrinho.service';
import { EnderecosService } from '../endereco/enderecos.service';
import { calcularFrete } from '../frete';

export interface ResumoCheckout {
  quantidadeItens: number;
  subtotal: number;
  frete: number;
  total: number;
  endereco: EnderecoEntrega;
}

export interface NovoPedido {
  /** Gerada uma vez por tentativa; o Java deduplica por ela (SRS 4.3). */
  idempotencyKey: string;
  metodo: MetodoPagamento;
}

export interface PedidoCriado {
  id: string;
  status: StatusPedido;
}

/** Falta algo para pagar (carrinho vazio ou sem endereço); a mensagem vai para a tela. */
export class CheckoutIncompletoError extends Error {}

/**
 * Fechamento do checkout: junta o carrinho e o endereço escolhido.
 *
 * TODO: quando o serviço Java existir, `finalizar` vira
 * `POST /api/v1/orders` com os itens do carrinho, o endereço e o método.
 * Dados do cartão não são enviados: o gateway é simulado no Java.
 */
@Injectable({ providedIn: 'root' })
export class PagamentoService {
  private readonly carrinho = inject(CarrinhoService);
  private readonly enderecos = inject(EnderecosService);
  private readonly pedidos = inject(PedidosService);

  /** Mesma chave = mesmo pedido (evita duplicar com clique duplo ou reenvio). */
  private readonly criadosPorChave = new Map<string, PedidoCriado>();

  obterResumo(): Observable<ResumoCheckout> {
    return defer(() => {
      const problema = this.verificarCheckout();
      if (problema) {
        return throwError(() => problema);
      }
      const subtotal = this.carrinho.subtotal();
      const frete = calcularFrete(subtotal);
      return of({
        quantidadeItens: this.carrinho.quantidadeItens(),
        subtotal,
        frete,
        total: subtotal + frete,
        endereco: this.enderecos.selecionado()!,
      }).pipe(delay(LATENCIA_MOCK_MS));
    });
  }

  finalizar(novo: NovoPedido): Observable<PedidoCriado> {
    return defer(() => {
      const repetido = this.criadosPorChave.get(novo.idempotencyKey);
      if (repetido) {
        return of(repetido).pipe(delay(LATENCIA_MOCK_MS));
      }
      const problema = this.verificarCheckout();
      if (problema) {
        return throwError(() => problema);
      }

      const pedido = this.montarPedido(novo.metodo);
      this.pedidos.registrar(pedido);
      this.carrinho.limpar();

      const criado = { id: pedido.id, status: pedido.status };
      this.criadosPorChave.set(novo.idempotencyKey, criado);
      return of(criado).pipe(delay(LATENCIA_MOCK_MS * 2));
    });
  }

  private verificarCheckout(): CheckoutIncompletoError | null {
    if (this.carrinho.vazio()) {
      return new CheckoutIncompletoError('Seu carrinho está vazio.');
    }
    if (!this.enderecos.selecionado()) {
      return new CheckoutIncompletoError('Escolha um endereço de entrega antes de pagar.');
    }
    return null;
  }

  private montarPedido(metodo: MetodoPagamento): Pedido {
    const agora = new Date().toISOString();
    // Regra do SRS: PIX/boleto ficam PENDING; cartão aprovado no mock vira PAID.
    const aprovado = metodo === 'CREDIT_CARD';
    const subtotal = this.carrinho.subtotal();
    const frete = calcularFrete(subtotal);
    const { apelido, cep, rua, numero, complemento, bairro, cidade, uf } =
      this.enderecos.selecionado()!;

    return {
      id: crypto.randomUUID(),
      criadoEm: agora,
      status: aprovado ? 'PAID' : 'PENDING',
      subtotal,
      frete,
      total: subtotal + frete,
      itens: this.carrinho.itens().map(
        ({ produtoId, nome, sku, slug, imagemUrl, quantidade, precoUnitario }) => ({
          produtoId,
          nome,
          sku,
          slug,
          imagemUrl: imagemUrl ?? null,
          quantidade,
          precoUnitario,
        }),
      ),
      endereco: { apelido, cep, rua, numero, complemento, bairro, cidade, uf },
      pagamento: { metodo, status: aprovado ? 'APPROVED' : 'PENDING' },
      historico: aprovado
        ? [
            { status: 'PENDING', em: agora },
            { status: 'PAID', em: agora },
          ]
        : [{ status: 'PENDING', em: agora }],
    };
  }
}

const LATENCIA_MOCK_MS = 400;
