import {createClient} from '@supabase/supabase-js';
import {zipSync,strToU8} from 'fflate';
import {changeDraftAsset} from './asset-changes';
import type {Database} from '../supabase/database.types';
import type {DraftRelease} from './admin-drafts';

describe('Draft asset changes with the installed SDK',()=>{
 const a='11111111-1111-4111-8111-111111111111',id='22222222-2222-4222-8222-222222222222',old=`${a}/${id}.zip`;
 const row={id,addon_id:a,version:'1',game_version:'Test',interface_version:1,status:'draft',file_path:old,file_size_bytes:10,sha256:'a'.repeat(64),updated_at:'2026-11-19T10:00:00Z',created_at:'',published_at:null,changelog:''} as DraftRelease;
 const bytes=zipSync({'Prueba/Prueba.toc':strToU8('## Interface: 16001')});
 const file={name:'test.zip',size:bytes.length,arrayBuffer:async()=>bytes.buffer} as File;
 function scenario(mode:'ok'|'declined'|'unknown'|'cleanup'|'missing'){
  let current={...row};const objects=new Set([old]);const removed:string[]=[];let uploaded='';
  const client=createClient<Database>('https://example.supabase.co','synthetic-public-key',{auth:{persistSession:false,autoRefreshToken:false,storageKey:crypto.randomUUID()},global:{fetch:async(input,init)=>{
   const url=new URL(String(input));
   if(url.pathname.endsWith('/rpc/change_draft_asset')){
    const args=JSON.parse(String(init?.body));
    if(mode==='missing')return Response.json({message:'missing function'},{status:404});
    if(!args.p_note)return Response.json({message:'ASSET_NOTE_REQUIRED',code:'P0001'},{status:400});
    expect(objects.has(old)).toBe(true);expect(objects.has(args.p_path)).toBe(true);
    if(mode==='declined')return Response.json({message:'ASSET_CONFLICT',code:'40001'},{status:400});
    current={...current,file_path:args.p_path};return Response.json(null,{status:200}); // Includes lost/empty reply reconciliation.
   }
   if(url.pathname.endsWith('/rpc/retire_asset_object'))return Response.json(true);
   if(url.pathname.endsWith('/rpc/admin_access'))return Response.json('admin');
   if(url.pathname.includes('/rest/v1/addon_releases'))return mode==='unknown'?Response.json({message:'session expired'},{status:401}):Response.json(current);
   if(url.pathname.includes('/storage/v1/object/list/'))return Response.json([...objects].filter(path=>path.endsWith(JSON.parse(String(init?.body)).search)).map(path=>({name:path.split('/').pop()})));
   if(init?.method==='DELETE'){
    const path=JSON.parse(String(init.body)).prefixes[0];removed.push(path);
    if(mode==='cleanup')return Response.json({message:'storage unavailable'},{status:503});objects.delete(path);return Response.json([]);
   }
   uploaded=url.pathname.split('/storage/v1/object/addon-files/')[1]!;objects.add(uploaded);expect(new Headers(init?.headers).get('x-upsert')).toBe('false');return Response.json({Key:uploaded});
  }}});
  return{client,objects,removed,get uploaded(){return uploaded;}};
 }
 it('uploads a fresh path, reconciles metadata and only then removes the original',async()=>{
  const test=scenario('ok');const result=await changeDraftAsset(test.client,{kind:'release',row},'Reemplazo revisado de prueba',file);
  expect(result.saved?.file_path).toBe(test.uploaded);expect(test.uploaded).not.toBe(old);expect(test.removed).toEqual([old]);expect(result.cleanupPending).toBe(false);
 });
 it('retains originals on conflict or uncertain reconciliation and never deletes a referenced replacement',async()=>{
  const conflict=scenario('declined');await expect(changeDraftAsset(conflict.client,{kind:'release',row},'Reemplazo revisado de prueba',file)).rejects.toThrow('Recarga');expect(conflict.objects.has(old)).toBe(true);expect(conflict.removed).toEqual([conflict.uploaded]);
  const unknown=scenario('unknown');await expect(changeDraftAsset(unknown.client,{kind:'release',row},'Reemplazo revisado de prueba',file)).rejects.toThrow('Respuesta incierta');expect(unknown.removed).toEqual([]);expect(unknown.objects.size).toBe(2);
 });
 it('distinguishes a committed change with pending cleanup and stops before upload without the migration',async()=>{
  const test=scenario('cleanup');const result=await changeDraftAsset(test.client,{kind:'release',row},'Reemplazo revisado de prueba',file);expect(result.cleanupPending).toBe(true);expect(result.saved?.file_path).toBe(test.uploaded);
  const missing=scenario('missing');await expect(changeDraftAsset(missing.client,{kind:'release',row},'Reemplazo revisado de prueba',file)).rejects.toThrow('aún no está disponible');expect(missing.uploaded).toBe('');
  await expect(changeDraftAsset(test.client,{kind:'release',row:{...row,status:'published'}},'No debe modificar publicado',file)).rejects.toThrow('protegido');
 });
});
