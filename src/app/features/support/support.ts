import { afterNextRender, ChangeDetectionStrategy, Component, DestroyRef, Injector, inject, InjectionToken, signal } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { PageSeo } from '../../core/seo/page-seo';
import { RouterLink } from '@angular/router';

export const SUPPORT_NAVIGATE = new InjectionToken<(url: string) => void>('supportNavigate', {
  providedIn: 'root', factory: () => url => window.location.assign(url),
});

@Component({
  selector: 'app-support',
  imports: [RouterLink],
  templateUrl: './support.html',
  styleUrl: './support.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Support {
  readonly amounts = [300, 500, 1000, 2000];
  readonly amount = signal(500);
  readonly availability = signal<'loading' | 'disabled' | 'test'>('disabled');
  readonly busy = signal(false);
  readonly cooldownSeconds = signal(0);
  readonly error = signal('');
  readonly returnState = signal('');
  readonly receiptState=signal<'idle'|'checking'|'pending'|'paid'|'failed'|'expired'|'unverified'|'unavailable'>('idle');
  readonly receiptAmount=signal<number|null>(null);
  private receiptToken='';private receiptTimer:ReturnType<typeof setTimeout>|undefined;
  private readonly receiptAbort=new AbortController();private receiptGeneration=0;
  private returnRestored=false;
  private readonly injector=inject(Injector);private readonly document=inject(DOCUMENT);
  private readonly seo=inject(PageSeo);
  private attempt: string | null = null;
  private readonly navigate = inject(SUPPORT_NAVIGATE);
  private cooldownTimer: ReturnType<typeof setInterval> | undefined;

  constructor() {
    inject(DestroyRef).onDestroy(() => {clearInterval(this.cooldownTimer);clearTimeout(this.receiptTimer);this.receiptAbort.abort();});
    inject(PageSeo).update({title:'Apoya la plataforma | WoW Forever Addons',description:'Apoya voluntariamente el mantenimiento de WoW Forever Addons. Las aportaciones no conceden acceso ni ventajas.',path:'/apoyar'});
    afterNextRender(() => {
      this.restoreReturn(new URL(window.location.href));
      void this.loadAvailability();
    });
  }

  restoreReturn(url:URL){
    if(this.returnRestored)return;
    const state=url.searchParams.get('checkout');
    if(state!=='return'&&state!=='cancelled')return;
    this.returnRestored=true;
    this.seo.update({title:'Comprobación de la aportación | WoW Forever Addons',description:'Estado privado de una aportación de prueba.',path:'/apoyar',noindex:true});
    if(state==='cancelled'){this.returnState.set('Has vuelto sin completar Checkout. Puedes seguir explorando los addons gratis.');return;}
    if(state!=='return')return;
    afterNextRender(()=>this.document.getElementById('support-receipt')?.focus(),{injector:this.injector});
    try{
      const explicit=url.searchParams.get('session_id');
      const sid=explicit??sessionStorage.getItem('wfa-support-return');
      if(explicit!==null){
        sessionStorage.removeItem('wfa-support-return');
        if(/^cs_test_[A-Za-z0-9_]{1,240}$/.test(explicit))sessionStorage.setItem('wfa-support-return',explicit);
        url.searchParams.delete('session_id');
        history.replaceState(history.state,'',url.pathname+url.search+url.hash);
      }
      if(!sid||!/^cs_test_[A-Za-z0-9_]{1,240}$/.test(sid))throw new Error();
      this.receiptToken=sessionStorage.getItem('wfa-support-receipt:'+sid)??'';
      if(!this.receiptToken)throw new Error();
      void this.verifyReceipt();
    }catch{this.receiptState.set('unverified');}
  }

  async verifyReceipt():Promise<void>{
    if(!this.receiptToken||this.receiptAbort.signal.aborted)return;
    clearTimeout(this.receiptTimer);const generation=++this.receiptGeneration;
    await this.readReceipt(generation,0);
  }
  private async readReceipt(generation:number,index:number):Promise<void>{
    if(generation!==this.receiptGeneration||this.receiptAbort.signal.aborted)return;
    this.receiptState.set('checking');
    try{
      const response=await fetch('/api/support-status',{method:'POST',credentials:'omit',cache:'no-store',headers:{'Content-Type':'application/json'},body:JSON.stringify({receipt:this.receiptToken}),signal:AbortSignal.any([this.receiptAbort.signal,AbortSignal.timeout(10000)])});
      if(generation!==this.receiptGeneration||this.receiptAbort.signal.aborted)return;
      if(response.status===403||response.status===400){this.receiptState.set('unverified');return;}
      if(!response.ok)throw new Error();
      const data=await response.json();
      if(generation!==this.receiptGeneration||this.receiptAbort.signal.aborted)return;
      if(data.mode!=='test'||data.currency!=='eur'||!this.amounts.includes(data.amount)||!['pending','paid','failed','expired'].includes(data.state))throw new Error();
      this.receiptAmount.set(data.amount);this.receiptState.set(data.state);
      const delays=[1500,3000,6000,12000];
      if(data.state==='pending'&&index<delays.length)this.receiptTimer=setTimeout(()=>{void this.readReceipt(generation,index+1);},delays[index]);
    }catch{if(generation===this.receiptGeneration&&!this.receiptAbort.signal.aborted)this.receiptState.set('unavailable');}
  }

  async loadAvailability() {
    this.availability.set('loading');
    try {
      const response = await fetch('/api/support-checkout', { credentials: 'omit', cache: 'no-store', signal: AbortSignal.timeout(12_000) });
      if (!response.ok) throw new Error();
      const data = await response.json();
      this.availability.set(data.enabled === true && data.mode === 'test' && data.currency === 'eur' &&
        JSON.stringify(data.amounts) === JSON.stringify(this.amounts) ? 'test' : 'disabled');
    } catch { this.availability.set('disabled'); }
  }

  selectAmount(amount: number) {
    if (this.busy() || this.cooldownSeconds() > 0 || !this.amounts.includes(amount) || amount === this.amount()) return;
    this.amount.set(amount); this.attempt = null; this.error.set('');
  }

  async startCheckout() {
    if (this.busy() || this.cooldownSeconds() > 0 || this.availability() !== 'test') return;
    this.busy.set(true); this.error.set('');
    try {
      this.attempt ??= crypto.randomUUID();
      const response = await fetch('/api/support-checkout', {
        method: 'POST', credentials: 'omit', cache: 'no-store', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: this.amount(), attemptId: this.attempt }), signal: AbortSignal.timeout(15_000),
      });
      if (response.status === 429) {
        const seconds = Number(response.headers.get('Retry-After'));
        const wait = Number.isInteger(seconds) && seconds > 0 && seconds <= 3600 ? seconds : 60;
        const retryAt = Date.now() + wait * 1000;
        this.cooldownSeconds.set(wait);
        clearInterval(this.cooldownTimer);
        this.cooldownTimer = setInterval(() => {
          this.cooldownSeconds.set(Math.max(0, Math.ceil((retryAt - Date.now()) / 1000)));
          if (this.cooldownSeconds() === 0) {
            clearInterval(this.cooldownTimer);
            this.error.set('Ya puedes reintentar Checkout de pruebas. No se ha confirmado ninguna aportación.');
          }
        }, 1000);
        this.error.set(`Se ha alcanzado el límite temporal de pruebas. Espera ${wait} segundos antes de reintentar. No se ha abierto Checkout.`);
        return;
      }
      if (!response.ok) throw new Error();
      const data = await response.json();
      const url = new URL(data.url);
      if (data.mode !== 'test' || url.protocol !== 'https:' || url.hostname !== 'checkout.stripe.com' || url.port ||
          url.username || url.password || !/^\/[cg]\/pay\/cs_test_[A-Za-z0-9_]+$/.test(url.pathname)) throw new Error();
      if(typeof data.sessionId!=='string'||url.pathname.split('/').pop()!==data.sessionId||typeof data.receipt!=='string'||data.receipt.length>1024||!/^[-_A-Za-z0-9]+\.[-_A-Za-z0-9]+$/.test(data.receipt))throw new Error();
      sessionStorage.setItem('wfa-support-receipt:'+data.sessionId,data.receipt);
      this.navigate(url.href);
    } catch {
      this.error.set('No se ha podido abrir Checkout de pruebas. Puedes reintentar con el mismo importe. No se ha confirmado ninguna aportación.');
    } finally { this.busy.set(false); }
  }
}
