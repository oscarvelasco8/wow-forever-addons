import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { Catalog } from './catalog';
import { PublicCatalog } from '../../core/catalog/public-catalog';
describe('Catalog paging controls',()=>{
  afterEach(()=>vi.useRealTimers());
  it('debounces search and sends category slugs to the server',async()=>{
    vi.useFakeTimers();const ensure=vi.fn().mockResolvedValue(undefined);
    TestBed.configureTestingModule({providers:[provideRouter([]),{provide:PublicCatalog,useValue:{ensure,addons:signal([]),categories:signal([{slug:'same-name-one',name:'Mismo nombre',order:1},{slug:'same-name-two',name:'Mismo nombre',order:2}]),state:signal('ready'),nextCursor:signal(null),moreError:signal(''),moreLoading:signal(false)}}]});
    const fixture=TestBed.createComponent(Catalog),page=fixture.componentInstance;fixture.detectChanges();
    page.query.set('navega');fixture.detectChanges();page.query.set('navegacion vuelos');page.category.set('same-name-two');fixture.detectChanges();
    await vi.advanceTimersByTimeAsync(310);expect(ensure).toHaveBeenCalledOnce();expect(ensure).toHaveBeenCalledWith('navegacion vuelos','same-name-two');
    const select=fixture.nativeElement.querySelector('select') as HTMLSelectElement;expect([...select.options].map(option=>option.value)).toEqual(['','same-name-one','same-name-two']);
    page.reset();fixture.detectChanges();await vi.advanceTimersByTimeAsync(310);expect(ensure).toHaveBeenLastCalledWith('','');
  });
});
