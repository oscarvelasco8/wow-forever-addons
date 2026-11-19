import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../supabase/database.types';
import type { DraftImage } from './admin-assets';
import type { DraftRelease } from './admin-drafts';
import { inspectZip, validateImageFile, assetId, ZIP_LIMIT } from './asset-validation';

type Client = SupabaseClient<Database>;
export async function draftAssetStatus(client:Client,addon:string):Promise<{ready:boolean;pending:{id:string;bucket:string;path:string}[]}>{
 const result=await client.rpc('draft_asset_status',{p_addon:addon});
 const data=result.data as {ready?:boolean;pending?:{id:string;bucket:string;path:string}[]}|null;
 return {ready:!result.error&&data?.ready===true,pending:!result.error&&Array.isArray(data?.pending)?data.pending:[]};
}
export type AssetTarget = {kind:'release';row:DraftRelease}|{kind:'image';row:DraftImage};
export type AssetChangeResult = {saved:DraftRelease|DraftImage|null;cleanupPending:boolean;oldPath:string};

export async function cleanupRetiredAsset(client:Client,addon:string,id:string,bucket:string,path:string):Promise<void>{
 const local=client;
 const retired=await local.rpc('retire_asset_object',{p_addon:addon,p_id:id,p_bucket:bucket,p_path:path});
 if(retired.error || retired.data!==true)throw new Error('No se pudo reservar la limpieza. El archivo se conserva.');
 const result=await client.storage.from(bucket).remove([path]);
 if(result.error)throw new Error('La limpieza de Storage sigue pendiente.');
 const access=await client.rpc('admin_access');const slash=path.lastIndexOf('/');
 const listed=await client.storage.from(bucket).list(path.slice(0,slash),{search:path.slice(slash+1)});
 if(access.error || access.data!=='admin' || listed.error || listed.data.some(item=>item.name===path.slice(slash+1)))throw new Error('No se pudo comprobar la ausencia del archivo.');
}

export async function changeDraftAsset(client:Client,target:AssetTarget,note:string,file:File|null):Promise<AssetChangeResult>{
 if(note.trim().length<12 || note.length>1000)throw new Error('Escribe un motivo de entre 12 y 1000 caracteres.');
 if(target.kind==='release'?(target.row.status!=='draft'||!!target.row.published_at):target.row.is_published)throw new Error('Un archivo publicado está protegido.');
 const {addon_id:addon,id,updated_at:stamp,file_path:oldPath}=target.row;
 if(!oldPath)throw new Error('No hay un archivo asociado.');
 const local=client,bucket=target.kind==='release'?'addon-files':'addon-images';
 let path:string|null=null,size:number|null=null,sha:string|null=null;
 if(file){
   let extension:string,mime:string;
   if(target.kind==='release'){
     if(file.size>ZIP_LIMIT)throw new Error('El ZIP supera 50 MiB.');
     const info=inspectZip(new Uint8Array(await file.arrayBuffer()),file.name);size=info.size;sha=info.sha256;extension='zip';mime='application/zip';
   }else{const info=await validateImageFile(file);extension=info.extension;mime=info.mime;}
   path=`${addon}/${id}/${assetId()}.${extension}`;
   // Probe the pending contract without changing a row; missing RPC must stop before upload.
   const probe=await local.rpc('change_draft_asset',{p_addon:addon,p_entity:target.kind,p_id:id,p_expected:stamp,p_note:''});
   if(probe.error?.message!=='ASSET_NOTE_REQUIRED')throw new Error('La gestión segura de archivos aún no está disponible o tu sesión ha caducado.');
   const upload=await client.storage.from(bucket).upload(path,file,{contentType:mime,upsert:false,cacheControl:'0'});
   if(upload.error)throw new Error('No se subió el reemplazo. El archivo anterior se conserva.');
 }
 let result;
 try{result=await local.rpc('change_draft_asset',{p_addon:addon,p_entity:target.kind,p_id:id,p_expected:stamp,p_path:path??undefined,p_size:size??undefined,p_sha:sha??undefined,p_note:note.trim()});}catch{/* Reconcile a lost reply. */}
 const table=target.kind==='release'?'addon_releases':'addon_images';
 const current=await client.from(table).select('*').eq('id',id).eq('addon_id',addon).maybeSingle();
 if(current.error)throw new Error('Respuesta incierta. No se ha eliminado ningún archivo: recarga antes de continuar.');
 const committed=path?current.data?.file_path===path:target.kind==='release'?!!current.data&&current.data.file_path===null:!current.data;
 if(!committed){
   if(path){try{await cleanupRetiredAsset(client,addon,id,bucket,path);}catch{throw new Error(`El cambio no se confirmó. Requiere revisar la subida nueva: ${bucket}/${path}. Recarga antes de continuar.`);}}
   throw new Error(result?.error?.code==='40001'?'El archivo cambió. Recarga antes de continuar.':'No se confirmó este cambio. Recarga los archivos antes de continuar.');
 }
 let cleanupPending=false;
 try{await cleanupRetiredAsset(client,addon,id,bucket,oldPath);}catch{cleanupPending=true;}
 return {saved:current.data as DraftRelease|DraftImage|null,cleanupPending,oldPath};
}
