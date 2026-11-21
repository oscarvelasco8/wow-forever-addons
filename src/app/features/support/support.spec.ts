import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Support } from './support';
describe('External PayPal support',()=>{
 afterEach(()=>{vi.unstubAllGlobals();history.replaceState({},'','/');});
 it('opens only the external link and never verifies historical test returns',async()=>{
 history.replaceState({},'','/apoyar?checkout=return&session_id=cs_test_fixture');
 const fetchSpy=vi.fn();vi.stubGlobal('fetch',fetchSpy);
 TestBed.configureTestingModule({providers:[provideRouter([])]});
 const fixture=TestBed.createComponent(Support);fixture.detectChanges();await fixture.whenStable();
 const link=fixture.nativeElement.querySelector('a[href="https://paypal.me/devel8ping"]');
 expect(link).not.toBeNull();expect(link.target).toBe('_blank');expect(link.rel).toContain('noopener');expect(fetchSpy).not.toHaveBeenCalled();expect(fixture.nativeElement.textContent).not.toContain('confirmada');
 });
});
