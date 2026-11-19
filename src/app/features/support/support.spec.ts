import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Support, SUPPORT_NAVIGATE } from './support';

describe('Support test checkout', () => {
  beforeEach(()=>history.replaceState({},'','/'));
  afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); sessionStorage.clear(); });
  it('does not confirm a modified return URL or a missing tab verifier',()=>{
    TestBed.configureTestingModule({providers:[provideRouter([])]});const fixture=TestBed.createComponent(Support);
    fixture.componentInstance.restoreReturn(new URL(location.origin+'/apoyar?checkout=return&session_id=cs_test_other'));
    expect(fixture.componentInstance.receiptState()).toBe('unverified');expect(location.search).not.toContain('session_id');
  });
  it('waits for the webhook, confirms the durable response and stops polling after success',async()=>{
    vi.useFakeTimers();let calls=0;
    vi.stubGlobal('fetch',vi.fn(async(url)=>{if(url==='/api/support-status'){calls++;return{ok:true,json:async()=>({mode:'test',state:calls===1?'pending':'paid',amount:500,currency:'eur'})};}return{ok:true,json:async()=>({enabled:false})};}));
    sessionStorage.setItem('wfa-support-receipt:cs_test_fixture','fixture.proof');
    TestBed.configureTestingModule({providers:[provideRouter([])]});const fixture=TestBed.createComponent(Support),component=fixture.componentInstance;
    component.restoreReturn(new URL(location.origin+'/apoyar?checkout=return&session_id=cs_test_fixture'));
    await vi.advanceTimersByTimeAsync(0);expect(component.receiptState()).toBe('pending');
    await vi.advanceTimersByTimeAsync(1500);expect(component.receiptState()).toBe('paid');expect(component.receiptAmount()).toBe(500);
    await vi.advanceTimersByTimeAsync(30000);expect(calls).toBe(2);
  });
  it('never creates a payment when status lookup fails and limits automatic checks',async()=>{
    vi.useFakeTimers();const navigate=vi.fn();let calls=0;
    vi.stubGlobal('fetch',vi.fn(async(url)=>{if(url==='/api/support-status'){calls++;return{ok:true,json:async()=>({mode:'test',state:'pending',amount:500,currency:'eur'})};}return{ok:true,json:async()=>({enabled:false})};}));
    sessionStorage.setItem('wfa-support-receipt:cs_test_fixture','fixture.proof');TestBed.configureTestingModule({providers:[provideRouter([]),{provide:SUPPORT_NAVIGATE,useValue:navigate}]});
    const fixture=TestBed.createComponent(Support),component=fixture.componentInstance;component.restoreReturn(new URL(location.origin+'/apoyar?checkout=return&session_id=cs_test_fixture'));
    await vi.advanceTimersByTimeAsync(60000);expect(calls).toBe(5);expect(component.receiptState()).toBe('pending');expect(navigate).not.toHaveBeenCalled();
    vi.stubGlobal('fetch',vi.fn().mockRejectedValue(new Error()));await component.verifyReceipt();expect(component.receiptState()).toBe('unavailable');
  });
  it('explains throttling and preserves the retry identity without navigating', async () => {
    vi.useFakeTimers();
    const bodies:string[]=[];
    vi.stubGlobal('fetch',vi.fn(async(_url,init)=>{
      if(!init?.method)return{ok:true,json:async()=>({enabled:true,mode:'test',currency:'eur',amounts:[300,500,1000,2000]})};
      bodies.push(init.body);return {ok:false,status:429,headers:new Headers({'Retry-After':'42'})};
    }));
    const navigate=vi.fn();TestBed.configureTestingModule({providers:[provideRouter([]),{provide:SUPPORT_NAVIGATE,useValue:navigate}]});
    const component=TestBed.createComponent(Support).componentInstance;
    await component.loadAvailability();await component.startCheckout();await component.startCheckout();
    expect(component.error()).toContain('Espera 42 segundos');expect(bodies.length).toBe(1);expect(component.cooldownSeconds()).toBe(42);
    await vi.advanceTimersByTimeAsync(42000);expect(component.cooldownSeconds()).toBe(0);
    await component.startCheckout();expect(bodies[0]).toBe(bodies[1]);expect(navigate).not.toHaveBeenCalled();
  });
  it('stays unavailable when configuration fails and never navigates', async () => {
    vi.stubGlobal('fetch',vi.fn().mockRejectedValue(new Error())); const navigate=vi.fn();
    TestBed.configureTestingModule({providers:[provideRouter([]),{provide:SUPPORT_NAVIGATE,useValue:navigate}]});
    const fixture=TestBed.createComponent(Support); fixture.detectChanges(); await fixture.whenStable(); await fixture.componentInstance.loadAvailability();
    await fixture.componentInstance.startCheckout(); fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('no acepta ni procesa dinero'); expect(navigate).not.toHaveBeenCalled();
  });
  it('reuses an uncertain attempt, changes it with amount and rejects external redirects', async () => {
    const bodies: string[]=[]; let unsafe=false;
    vi.stubGlobal('fetch',vi.fn(async (_url,init) => {
      if(!init?.method) return {ok:true,json:async()=>({enabled:true,mode:'test',currency:'eur',amounts:[300,500,1000,2000]})};
      bodies.push(init.body); if(bodies.length===1) throw new Error();
      return {ok:true,json:async()=>({mode:'test',url:unsafe?'https://evil.example':'https://checkout.stripe.com/g/pay/cs_test_fixture',sessionId:'cs_test_fixture',receipt:'fixture.proof'})};
    }));
    const navigate=vi.fn(); TestBed.configureTestingModule({providers:[provideRouter([]),{provide:SUPPORT_NAVIGATE,useValue:navigate}]});
    const fixture=TestBed.createComponent(Support), component=fixture.componentInstance;
    await component.loadAvailability(); await component.startCheckout(); expect(component.error()).toContain('reintentar');
    await component.startCheckout(); expect(bodies[0]).toBe(bodies[1]); expect(navigate).toHaveBeenCalledTimes(1);
    component.selectAmount(1000); unsafe=true; await component.startCheckout();
    expect(JSON.parse(bodies[2]!).attemptId).not.toBe(JSON.parse(bodies[0]!).attemptId);
    expect(navigate).toHaveBeenCalledTimes(1); expect(component.error()).toBeTruthy();
  });
});
