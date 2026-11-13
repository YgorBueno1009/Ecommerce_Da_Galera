import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { fakeAsync, TestBed, tick } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { Cabecalho } from './cabecalho';

describe('Cabecalho', () => {
  let http: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Cabecalho],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('shows at most five matching products and supports keyboard selection', fakeAsync(() => {
    const fixture = TestBed.createComponent(Cabecalho);
    fixture.detectChanges();

    const input = fixture.nativeElement.querySelector(
      'input[aria-label="Buscar produtos"]',
    ) as HTMLInputElement;
    input.value = 'cafeteira';
    input.dispatchEvent(new Event('input'));

    tick(200);
    const request = http.expectOne(
      (candidate) =>
        candidate.url === '/catalog/products' &&
        candidate.params.get('q') === 'cafeteira' &&
        candidate.params.get('limit') === '5',
    );
    request.flush(
      Array.from({ length: 6 }, (_, index) => ({
        id: `produto-${index}`,
        slug: `produto-${index}`,
        nome: `Produto ${index}`,
        sku: `SKU-${index}`,
        preco: 99,
        categoria: 'cozinha',
        oferta: false,
        estoque: 3,
        voltagem: null,
        cor: null,
        tamanho: null,
        fichaTecnica: [],
      })),
    );

    fixture.detectChanges();
    const options = fixture.nativeElement.querySelectorAll(
      '.cabecalho__sugestao',
    ) as NodeListOf<HTMLAnchorElement>;
    expect(options.length).toBe(5);

    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    fixture.detectChanges();
    expect(options[0].getAttribute('aria-selected')).toBe('true');

    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    fixture.detectChanges();
    expect(options[1].getAttribute('aria-selected')).toBe('true');

    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }));
    fixture.detectChanges();
    expect(options[0].getAttribute('aria-selected')).toBe('true');

    const router = TestBed.inject(Router);
    spyOn(router, 'navigate').and.returnValue(Promise.resolve(true));
    input.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }),
    );
    expect(router.navigate).toHaveBeenCalledWith(['/catalog/product', 'produto-0']);
  }));
});
