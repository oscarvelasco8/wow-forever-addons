import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { ADMIN_AUTH_GATEWAY, AdminAccess, AdminAuthGateway } from '../../core/auth/admin-access';
import { routes } from '../../app.routes';
import { AdminLogin } from './login';
import { AdminRecovery } from './recovery';
import { RecoveryRateLimitError } from '../../core/auth/auth-storage';

const gateway = (overrides: Partial<AdminAuthGateway> = {}): AdminAuthGateway => ({
  configured: true,
  checkAccess: async () => 'signed-out',
  signIn: async () => 'signed-out',
  requestRecovery: async () => undefined,
  signOut: async () => undefined,
  ...overrides,
});

const configure = (adapter?: AdminAuthGateway) => TestBed.configureTestingModule({
  providers: [provideRouter(routes), ...(adapter ? [{ provide: ADMIN_AUTH_GATEWAY, useValue: adapter }] : [])],
});

describe('Administrative access preparation', () => {
  it('restores a verified session on the login page without asking for the password again',async()=>{
    const signIn=vi.fn();configure(gateway({checkAccess:async()=>'admin',signIn}));const navigate=vi.spyOn(TestBed.inject(Router),'navigateByUrl').mockResolvedValue(true);
    const page=TestBed.createComponent(AdminLogin).componentInstance;await page.restore();expect(navigate).toHaveBeenCalledWith('/administracion');expect(signIn).not.toHaveBeenCalled();
  });
  it('does not send credentials or recovery requests without a configured provider', async () => {
    const signIn = vi.fn();
    const recovery = vi.fn();
    configure(gateway({ configured: false, signIn, requestRecovery: recovery }));
    const access = TestBed.inject(AdminAccess);
    expect(await access.signIn('fake@example.com', 'not-a-real-password')).toBe('unconfigured');
    expect(await access.requestRecovery('fake@example.com')).toBe('unconfigured');
    expect(signIn).not.toHaveBeenCalled();
    expect(recovery).not.toHaveBeenCalled();
  });

  it('redirects protected navigation to login while unconfigured', async () => {
    configure();
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/administracion');
    expect(TestBed.inject(Router).url).toBe('/administracion/acceso');
    expect(harness.routeNativeElement?.textContent).toContain('Conexión pendiente');
    expect(harness.routeNativeElement?.querySelector<HTMLButtonElement>('button[type="submit"]')?.disabled).toBe(true);
    expect(harness.routeNativeElement?.querySelector<HTMLInputElement>('#admin-password')?.disabled).toBe(true);
  });

  it('rejects an authenticated account without administrative permission', async () => {
    configure(gateway({ checkAccess: async () => 'forbidden' }));
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/administracion');
    expect(TestBed.inject(Router).url).toBe('/administracion/denegado');
    expect(harness.routeNativeElement?.textContent).toContain('no concede permisos');
  });

  it('does not grant access when session verification fails', async () => {
    configure(gateway({ checkAccess: async () => { throw new Error('provider error'); } }));
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/administracion');
    expect(TestBed.inject(Router).url).toBe('/administracion/acceso');
    expect(TestBed.inject(AdminAccess).state()).toBe('error');
  });

  it('routes password-only administrators to second-factor verification', async () => {
    configure(gateway({ signIn: async () => 'mfa-required' }));
    const router = TestBed.inject(Router);
    const navigate = vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);
    const page = TestBed.createComponent(AdminLogin).componentInstance;
    page.form.setValue({ email: 'fake@example.com', password: 'test-password' });
    await page.submit();
    expect(navigate).toHaveBeenCalledWith('/administracion/verificar');
    expect(page.form.controls.password.value).toBe('');
  });

  it('allows the protected placeholder only after an affirmative gateway check', async () => {
    configure(gateway({ checkAccess: async () => 'admin' }));
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/administracion');
    expect(harness.routeNativeElement?.textContent).toContain('Área de gestión.');
  });

  it('validates login before calling the provider and clears the password after a failed request', async () => {
    const signIn = vi.fn(async () => { throw new Error('private provider diagnostic'); });
    configure(gateway({ signIn }));
    const fixture = TestBed.createComponent(AdminLogin);
    const page = fixture.componentInstance;
    page.form.setValue({ email: 'invalid', password: 'fake-password' });
    await page.submit();
    expect(signIn).not.toHaveBeenCalled();
    page.form.setValue({ email: 'fake@example.com', password: 'fake-password' });
    await page.submit();
    expect(signIn).toHaveBeenCalledOnce();
    expect(page.form.controls.password.value).toBe('');
    expect(page.error()).not.toContain('private provider diagnostic');
    expect(page.error()).toContain('No se ha podido iniciar sesión');
    expect(page.busy()).toBe(false);
  });

  it('shows a neutral recovery result and ignores duplicate submissions', async () => {
    const requestRecovery = vi.fn(async () => undefined);
    configure(gateway({ requestRecovery }));
    const fixture = TestBed.createComponent(AdminRecovery);
    const page = fixture.componentInstance;
    page.form.controls.email.setValue('invalid');
    await page.submit();
    expect(requestRecovery).not.toHaveBeenCalled();
    page.form.controls.email.setValue('fake@example.com');
    await page.submit();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Si existe una cuenta');
    expect(page.form.controls.email.value).toBe('');
    await page.submit();
    expect(requestRecovery).toHaveBeenCalledOnce();
  });

  it('explains an email rate limit without claiming that a link was sent', async () => {
    configure(gateway({ requestRecovery: async () => { throw new RecoveryRateLimitError(); } }));
    const fixture = TestBed.createComponent(AdminRecovery);
    fixture.componentInstance.form.controls.email.setValue('test@example.test');
    await fixture.componentInstance.submit();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('límite temporal de correos');
    expect(fixture.componentInstance.accepted()).toBe(false);
  });

  it('clears the local access state even when remote sign-out fails', async () => {
    configure(gateway({ checkAccess: async () => 'admin', signOut: async () => { throw new Error('offline'); } }));
    const access = TestBed.inject(AdminAccess);
    await access.checkAccess();
    await expect(access.signOut()).rejects.toThrow();
    expect(access.state()).toBe('signed-out');
  });
});
