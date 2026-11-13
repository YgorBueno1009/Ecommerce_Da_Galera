import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { Sessao } from '../../../core/sessao/sessao';
import { CadastroCliente } from './cadastro-cliente';

describe('CadastroCliente', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CadastroCliente],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();
  });

  it('uses reactive validation to require valid fields and matching passwords', () => {
    const fixture = TestBed.createComponent(CadastroCliente);
    const component = fixture.componentInstance;

    fixture.detectChanges();
    expect(component.form.invalid).toBeTrue();
    expect(
      (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>(
        'button[type="submit"]',
      )?.disabled,
    ).toBeTrue();

    component.form.patchValue({
      fullName: 'Maria da Silva',
      email: 'maria@example.com',
      password: 'Senha-segura123!',
      confirmPassword: 'Senha-diferente123!',
      documentNumber: '52998224725',
      phone: '+5511999999999',
    });

    expect(component.form.invalid).toBeTrue();
    expect(component.passwordsMatch).toBeFalse();

    component.form.controls.confirmPassword.setValue('Senha-segura123!');
    expect(component.form.valid).toBeTrue();
    expect(component.passwordsMatch).toBeTrue();
  });

  it('validates each password requirement and updates its checklist', () => {
    const fixture = TestBed.createComponent(CadastroCliente);
    const component = fixture.componentInstance;
    const password = component.form.controls.password;

    fixture.detectChanges();

    const incompletePasswords = ['S1!abc', 'senha123!', 'SENHA123!', 'Senhaabc!', 'Senha1234'];

    for (const value of incompletePasswords) {
      password.setValue(value);
      expect(password.hasError('passwordRequirements')).toBeTrue();
    }

    password.setValue('Senha-segura123!');
    fixture.detectChanges();

    expect(password.valid).toBeTrue();
    expect(Object.values(component.passwordRules).every(Boolean)).toBeTrue();
    expect(
      (fixture.nativeElement as HTMLElement).querySelectorAll('.cadastro__regra-senha--validada')
        .length,
    ).toBe(5);
  });

  it('sets input character limits to match the registration field constraints', () => {
    const fixture = TestBed.createComponent(CadastroCliente);

    fixture.detectChanges();

    const inputMaxLength = (selector: string): string | null =>
      (fixture.nativeElement as HTMLElement)
        .querySelector<HTMLInputElement>(selector)
        ?.getAttribute('maxlength') ?? null;

    expect(inputMaxLength('#nome')).toBe('150');
    expect(inputMaxLength('#email')).toBe('254');
    expect(inputMaxLength('#senha')).toBe('72');
    expect(inputMaxLength('#confirmar-senha')).toBe('72');
    expect(inputMaxLength('#documento')).toBe('11');
    expect(inputMaxLength('#telefone')).toBe('20');

    (fixture.nativeElement as HTMLElement)
      .querySelectorAll<HTMLButtonElement>('.cadastro__documento-tipo button')[1]
      .click();
    fixture.detectChanges();
    expect(inputMaxLength('#documento')).toBe('14');
  });

  it('filters names to Unicode letters and spaces and numeric fields to digits', () => {
    const fixture = TestBed.createComponent(CadastroCliente);
    const component = fixture.componentInstance;

    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    const nameInput = root.querySelector<HTMLInputElement>('#nome');
    const documentInput = root.querySelector<HTMLInputElement>('#documento');
    const phoneInput = root.querySelector<HTMLInputElement>('#telefone');

    nameInput!.value = 'João Silva 2!';
    nameInput!.dispatchEvent(new Event('input'));
    documentInput!.value = '123.456a';
    documentInput!.dispatchEvent(new Event('input'));
    phoneInput!.value = '+5511-999';
    phoneInput!.dispatchEvent(new Event('input'));

    expect(component.form.controls.fullName.value).toBe('João Silva ');
    expect(component.form.controls.documentNumber.value).toBe('123456');
    expect(component.form.controls.phone.value).toBe('5511999');
  });

  it('shows an email conflict returned by the registration API and clears it when edited', () => {
    const fixture = TestBed.createComponent(CadastroCliente);
    const component = fixture.componentInstance;
    const httpTesting = TestBed.inject(HttpTestingController);

    component.form.setValue({
      fullName: 'Maria da Silva',
      email: 'maria@example.com',
      password: 'Senha-segura123!',
      confirmPassword: 'Senha-segura123!',
      documentNumber: '52998224725',
      phone: '+5511999999999',
    });
    component.submit();

    const request = httpTesting.expectOne('/auth/register');
    request.flush(
      { field: 'email', error: 'Este e-mail já está cadastrado.' },
      { status: 409, statusText: 'Conflict' },
    );

    expect(component.form.controls.email.hasError('emailAlreadyRegistered')).toBeTrue();
    expect(component.fieldInvalid('email')).toBeTrue();

    component.form.controls.email.setValue('outra@example.com');
    expect(component.form.controls.email.hasError('emailAlreadyRegistered')).toBeFalse();
    httpTesting.verify();
  });

  it('navigates to the storefront after registration succeeds', () => {
    const fixture = TestBed.createComponent(CadastroCliente);
    const component = fixture.componentInstance;
    const httpTesting = TestBed.inject(HttpTestingController);
    const router = TestBed.inject(Router);
    const sessao = TestBed.inject(Sessao);
    const navigateSpy = spyOn(router, 'navigateByUrl').and.resolveTo(true);
    spyOn(sessao, 'iniciar');

    component.form.setValue({
      fullName: 'Maria da Silva',
      email: 'maria@example.com',
      password: 'Senha-segura123!',
      confirmPassword: 'Senha-segura123!',
      documentNumber: '52998224725',
      phone: '(11) 99999-9999',
    });
    component.submit();

    httpTesting.expectOne('/auth/register').flush({
      token: 'token',
      user: {
        id: 'user-id',
        fullName: 'Maria da Silva',
        email: 'maria@example.com',
        role: 'CLIENTE',
      },
    });

    expect(navigateSpy).toHaveBeenCalledOnceWith('/catalog/home');
    httpTesting.verify();
  });
});
