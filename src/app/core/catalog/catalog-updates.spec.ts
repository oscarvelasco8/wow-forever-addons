import { announceCatalogChange, watchCatalogChanges } from './catalog-updates';
describe('Catalog invalidation across tabs', () => {
  it('notifies this tab and other tabs without sending product data', () => {
    const refresh = vi.fn(),
      stop = watchCatalogChanges(refresh);
    announceCatalogChange();
    expect(refresh).toHaveBeenCalledOnce();
    window.dispatchEvent(
      new StorageEvent('storage', { key: 'wfa-catalog-changed', newValue: 'marker' }),
    );
    expect(refresh).toHaveBeenCalledTimes(2);
    window.dispatchEvent(new StorageEvent('storage', { key: 'unrelated' }));
    expect(refresh).toHaveBeenCalledTimes(2);
    stop();
    announceCatalogChange();
    expect(refresh).toHaveBeenCalledTimes(2);
  });
});
