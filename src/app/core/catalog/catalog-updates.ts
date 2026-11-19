const eventName = 'wfa-catalog-changed';
/** No content, identifiers or credentials cross tabs: only an invalidation marker. */
export function announceCatalogChange(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event(eventName));
  try {
    localStorage.setItem(eventName, crypto.randomUUID());
  } catch {
    /* Same-tab refresh still works. */
  }
}
export function watchCatalogChanges(refresh: () => void): () => void {
  const changed = () => refresh();
  const stored = (event: StorageEvent) => {
    if (event.key === eventName) refresh();
  };
  window.addEventListener(eventName, changed);
  window.addEventListener('storage', stored);
  return () => {
    window.removeEventListener(eventName, changed);
    window.removeEventListener('storage', stored);
  };
}
