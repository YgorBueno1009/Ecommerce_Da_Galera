import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Vitrine } from './vitrine';

describe('Vitrine', () => {
  let http: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Vitrine],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('shows only products with available stock and keeps the search CTA linked', () => {
    const fixture = TestBed.createComponent(Vitrine);
    fixture.detectChanges();

    http
      .expectOne('/catalog/products?limit=32')
      .flush([product('em-estoque', 2), product('esgotado', 0), product('estoque-negativo', -1)]);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelectorAll('app-cartao-produto').length).toBe(1);
    const callToAction = fixture.nativeElement.querySelector(
      '.destaque__acao',
    ) as HTMLAnchorElement;
    expect(callToAction.tagName).toBe('A');
    expect(callToAction.getAttribute('href')).toBe('/catalog/search');
  });
});

function product(slug: string, estoque: number) {
  return {
    id: slug,
    slug,
    sku: slug.toUpperCase(),
    nome: slug,
    preco: 100,
    categoria: 'cozinha',
    oferta: false,
    estoque,
    voltagem: null,
    cor: null,
    tamanho: null,
    fichaTecnica: [],
  };
}
