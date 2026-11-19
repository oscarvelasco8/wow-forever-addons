const uuid = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';
export function publicAssetPath(addon: string,id: string,path: unknown,kind:'image'|'release'): boolean {
  if(typeof path!=='string' || !new RegExp(`^${uuid}$`,'i').test(addon) || !new RegExp(`^${uuid}$`,'i').test(id)) return false;
  return new RegExp(`^${addon}/${id}(?:/${uuid})?\\.${kind==='image'?'(?:png|jpg|webp)':'zip'}$`,'i').test(path);
}
