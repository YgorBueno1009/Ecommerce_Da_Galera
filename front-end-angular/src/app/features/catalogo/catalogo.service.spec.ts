import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { CatalogoService } from './catalogo.service';

describe('CatalogoService', () => {
  let service: CatalogoService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(CatalogoService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('sends search parameters to the product API', () => {
    service
      .listar({
        q: 'liquidificador',
        category: 'cozinha',
        sort: 'price-asc',
        limit: 8,
        color: ['Preto', 'Inox'],
      })
      .subscribe((products) => expect(products).toEqual([]));

    const request = http.expectOne(
      (candidate) =>
        candidate.url === '/catalog/products' &&
        candidate.params.get('q') === 'liquidificador' &&
        candidate.params.get('category') === 'cozinha' &&
        candidate.params.get('sort') === 'price-asc' &&
        candidate.params.get('limit') === '8' &&
        JSON.stringify(candidate.params.getAll('color')) === JSON.stringify(['Preto', 'Inox']),
    );
    request.flush([]);
  });

  it('loads categories and product details from the API', () => {
    service.listarCategorias().subscribe((categories) => expect(categories.length).toBe(1));
    http.expectOne('/catalog/categories').flush([{ slug: 'cozinha', nome: 'Cozinha' }]);

    service.buscarPorSlug('air-fryer-4l').subscribe((product) => {
      expect(product.slug).toBe('air-fryer-4l');
    });
    http.expectOne('/catalog/products/air-fryer-4l').flush({
      id: '39a03537-c727-43b6-b132-87e85b571759',
      slug: 'air-fryer-4l',
      sku: 'AIR-4L',
      nome: 'Air fryer',
      preco: 429.9,
      categoria: 'cozinha',
      oferta: true,
      estoque: 3,
      voltagem: '220v',
      cor: 'Preto',
      tamanho: 'Médio',
      fichaTecnica: [],
    });
  });
});
