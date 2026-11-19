import { TestBed } from '@angular/core/testing';
import { PublicCatalog } from './public-catalog';
const page=(addons:unknown[]=[],nextCursor:string|null=null)=>Response.json({addons,categories:[],nextCursor});
describe('Paged catalog source',()=>{
  afterEach(()=>vi.unstubAllGlobals());
  it('distinguishes empty data from errors and retries anonymously',async()=>{
    const request=vi.fn().mockResolvedValue(page());vi.stubGlobal('fetch',request);const catalog=TestBed.inject(PublicCatalog);
    await catalog.load();expect(catalog.state()).toBe('ready');expect(catalog.addons()).toEqual([]);
    request.mockResolvedValue({ok:false});await catalog.load();expect(catalog.state()).toBe('error');
    request.mockResolvedValue(page());await catalog.load();expect(catalog.state()).toBe('ready');
    expect(request).toHaveBeenCalledWith('/api/catalog',expect.objectContaining({credentials:'omit',cache:'no-store'}));
  });
  it('retains loaded results and the cursor after a failed next page and deduplicates retries',async()=>{
    const request=vi.fn().mockResolvedValueOnce(page([{slug:'one'}],'cursor-one')).mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce(page([{slug:'one'},{slug:'two'}]));vi.stubGlobal('fetch',request);
    const catalog=TestBed.inject(PublicCatalog);await catalog.load();await catalog.loadMore();
    expect(catalog.addons().map(addon=>addon.slug)).toEqual(['one']);expect(catalog.nextCursor()).toBe('cursor-one');expect(catalog.moreError()).not.toBe('');
    await catalog.loadMore();expect(catalog.addons().map(addon=>addon.slug)).toEqual(['one','two']);expect(catalog.nextCursor()).toBeNull();
  });
  it('aborts and ignores a late result after changing search',async()=>{
    let resolve!:(response:Response)=>void;const first=new Promise<Response>(done=>resolve=done);
    const request=vi.fn().mockReturnValueOnce(first).mockResolvedValueOnce(page([{slug:'current'}]));vi.stubGlobal('fetch',request);
    const catalog=TestBed.inject(PublicCatalog),pending=catalog.load('old');await catalog.load('new');
    resolve(page([{slug:'obsolete'}]));await pending;
    expect(catalog.addons().map(addon=>addon.slug)).toEqual(['current']);expect(request.mock.calls[0][1].signal.aborted).toBe(true);
  });
});
