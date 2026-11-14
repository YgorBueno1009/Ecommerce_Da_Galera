import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Sessao } from '../../../core/sessao/sessao';
import { Produto } from '../../catalogo/produto.model';
import { CarrinhoService } from './carrinho.service';

const produtoTeste: Produto = {
  id: '39a03537-c727-43b6-b132-87e85b571759',
  slug: 'air-fryer-4l',
  nome: 'Air fryer 4L',
  sku: 'AIR-4L',
  preco: 429.9,
  categoria: 'cozinha',
  oferta: true,
  estoque: 3,
  voltagem: '220v',
  cor: 'Preto',
  tamanho: 'Médio',
  fichaTecnica: [],
};

describe('CarrinhoService', () => {
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
    localStorage.removeItem('ecommerce.sessao');
    localStorage.removeItem('ecommerce.carrinho');
  });

  afterEach(() => {
    http.verify();
    localStorage.removeItem('ecommerce.sessao');
    localStorage.removeItem('ecommerce.carrinho');
  });

  it('keeps visitor cart changes in local storage', () => {
    const cart = TestBed.inject(CarrinhoService);
    cart.adicionar(produtoTeste, 2);

    expect(cart.itens()).toEqual([
      {
        produtoId: produtoTeste.id,
        slug: produtoTeste.slug,
        nome: produtoTeste.nome,
        sku: produtoTeste.sku,
        precoUnitario: produtoTeste.preco,
        quantidade: 2,
        estoque: produtoTeste.estoque,
      },
    ]);
    expect(JSON.parse(localStorage.getItem('ecommerce.carrinho') ?? '[]').length).toBe(1);
  });

  it('loads and updates an authenticated cart through the Node API', () => {
    const session = TestBed.inject(Sessao);
    session.iniciar(tokenDeLoja(), {
      id: 'admin-id',
      fullName: 'Cliente Teste',
      email: 'cliente@example.com',
      role: 'CLIENTE',
    });

    const cart = TestBed.inject(CarrinhoService);
    http.expectOne('/cart').flush({ itens: [], quantidadeItens: 0, subtotal: 0 });

    cart.adicionar(produtoTeste, 1);
    const addRequest = http.expectOne('/cart/items');
    expect(addRequest.request.method).toBe('POST');
    expect(addRequest.request.headers.get('Authorization')).toBe(`Bearer ${tokenDeLoja()}`);
    expect(addRequest.request.body).toEqual({ productId: produtoTeste.id, quantity: 1 });
    addRequest.flush({ message: 'Item adicionado ao carrinho' });
    http.expectOne('/cart').flush({
      itens: [
        {
          produtoId: produtoTeste.id,
          slug: produtoTeste.slug,
          nome: produtoTeste.nome,
          sku: produtoTeste.sku,
          precoUnitario: produtoTeste.preco,
          quantidade: 1,
          estoque: produtoTeste.estoque,
        },
      ],
      quantidadeItens: 1,
      subtotal: produtoTeste.preco,
    });
    expect(cart.itens()[0].quantidade).toBe(1);
  });
});

function tokenDeLoja(): string {
  const payload = btoa(
    JSON.stringify({
      exp: Math.floor(Date.now() / 1000) + 3600,
      role: 'CLIENTE',
      context: 'STORE',
    }),
  )
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
  return `header.${payload}.signature`;
}
