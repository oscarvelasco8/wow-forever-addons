import { TestBed } from '@angular/core/testing';
import { TransferState } from '@angular/core';
import { PublicAddonDetail,CATALOG_SNAPSHOT } from './public-addon-detail';
describe('Individual addon source',()=>{
  afterEach(()=>vi.unstubAllGlobals());
  it('consumes the SSR snapshot without requesting the entire catalog',async()=>{
    const transfer=TestBed.inject(TransferState);transfer.set(CATALOG_SNAPSHOT,{slug:'prueba',addons:[],state:'error'});
    const request=vi.fn();vi.stubGlobal('fetch',request);const detail=TestBed.inject(PublicAddonDetail);await detail.ensure('prueba');
    expect(detail.state()).toBe('error');expect(transfer.hasKey(CATALOG_SNAPSHOT)).toBe(false);expect(request).not.toHaveBeenCalled();
  });
  it('uses the selected slug and distinguishes unavailable from a provider error',async()=>{
    const request=vi.fn().mockResolvedValue(Response.json({addon:null},{status:404}));vi.stubGlobal('fetch',request);
    const detail=TestBed.inject(PublicAddonDetail);await detail.load('prueba');expect(detail.state()).toBe('ready');expect(detail.addons()).toEqual([]);
    expect(request).toHaveBeenCalledWith('/api/addon?slug=prueba',expect.objectContaining({credentials:'omit',cache:'no-store'}));
    request.mockResolvedValue(Response.json({error:'unavailable'},{status:503}));await detail.load();expect(detail.state()).toBe('error');
  });
});
