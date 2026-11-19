import {bootstrapApplication} from '@angular/platform-browser';
import {provideRouter} from '@angular/router';
import {App} from '../../src/app/app';
import {DraftAssets} from '../../src/app/features/admin/draft-assets';
import {SupabaseAdminGateway} from '../../src/app/core/auth/supabase-admin-gateway';
import type {DraftBundle} from '../../src/app/core/catalog/admin-drafts';
const id='11111111-1111-4111-8111-111111111111',rid='22222222-2222-4222-8222-222222222222',imageId='33333333-3333-4333-8333-333333333333',stamp='2026-11-19T14:00:00Z';
const bundle:DraftBundle={addon:{id,slug:'ejemplo',name:'Addon de ejemplo',category_id:id,summary:'Datos ficticios',description:'',author_name:'Ejemplo',license_name:'Pendiente',credits:'',installation_instructions:'',status:'draft',distribution_approved:false,published_at:null,created_at:stamp,updated_at:stamp},categories:[],releases:[{id:rid,addon_id:id,version:'1.0.0',game_version:'WoW Forever',interface_version:16001,changelog:'',status:'draft',file_path:`${id}/${rid}.zip`,file_size_bytes:1024,sha256:'a'.repeat(64),published_at:null,created_at:stamp,updated_at:stamp}]};
bootstrapApplication(App,{providers:[provideRouter([{path:'administracion/addons/:id/archivos',component:DraftAssets},{path:'**',redirectTo:`administracion/addons/${id}/archivos`}]),{provide:SupabaseAdminGateway,useValue:{loadAssetBundle:async()=>structuredClone(bundle),loadDraftImages:async()=>[{id:imageId,addon_id:id,file_path:`${id}/${imageId}.png`,alt_text:'Mapa de ejemplo en borrador',sort_order:0,is_published:false,created_at:stamp,updated_at:stamp}],draftAssetStatus:async()=>({ready:true,pending:[]}),changeDraftAsset:async()=>{throw new Error('Vista previa: no guarda cambios ni elimina archivos.');}}}]}).catch(console.error);
