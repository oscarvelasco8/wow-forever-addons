// Isolated visual harness: uses the production components with a read-only fixture.
// This entry is built by its own workspace, never by the production application.
import { bootstrapApplication } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { App } from '../../src/app/app';
import { Editorial } from '../../src/app/features/admin/editorial';
import { NewAddon } from '../../src/app/features/admin/new-addon';
import { AdminHome } from '../../src/app/features/admin/admin-home';
import { AdminAccess } from '../../src/app/core/auth/admin-access';
import { SupabaseAdminGateway } from '../../src/app/core/auth/supabase-admin-gateway';
import type { EditorialBundle } from '../../src/app/core/catalog/admin-editorial';

const addonId='11111111-1111-4111-8111-111111111111';
const releaseId='22222222-2222-4222-8222-222222222222';
const imageId='33333333-3333-4333-8333-333333333333';
const published=new URLSearchParams(location.search).get('estado')==='publicado';
const stamp='2026-11-19T08:00:00.000Z';
const fixture:EditorialBundle={
  addon:{id:addonId,slug:'addon-de-ejemplo',name:'Addon de ejemplo',summary:'Un contenido ficticio para revisar el panel antes de publicar.',description:'',category_id:addonId,author_name:'Equipo de ejemplo',license_name:'MIT · Solo ejemplo visual',credits:'',installation_instructions:'',status:published?'published':'draft',distribution_approved:published,published_at:published?stamp:null,created_at:stamp,updated_at:stamp},
  category:{id:addonId,slug:'herramientas',name:'Herramientas',is_visible:true,sort_order:0,created_at:stamp,updated_at:stamp},
  releases:[{id:releaseId,addon_id:addonId,version:'1.0.0-ejemplo',game_version:'Forever 1.60.1',interface_version:16001,changelog:'Ejemplo de presentación de una versión.',status:published?'published':'draft',file_path:`${addonId}/${releaseId}.zip`,file_size_bytes:245760,sha256:'a'.repeat(64),published_at:published?stamp:null,created_at:stamp,updated_at:stamp}],
  images:[{id:imageId,addon_id:addonId,file_path:`${addonId}/${imageId}.png`,alt_text:'Vista del mapa del addon de ejemplo',sort_order:0,is_published:published,created_at:stamp,updated_at:stamp}],
  events:[{id:'44444444-4444-4444-8444-444444444444',addon_id:addonId,entity:'addon_images',entity_id:imageId,operation:'UPDATE',actor_id:'55555555-5555-4555-8555-555555555555',occurred_at:stamp,note:'Texto alternativo y orden revisados para facilitar la lectura.',changed_fields:['alt_text','sort_order'],before_data:{alt_text:'Mapa de ejemplo',sort_order:1,is_published:false},after_data:{alt_text:'Vista del mapa del addon de ejemplo',sort_order:0,is_published:published}}],
};
const svg='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 320"><rect width="640" height="320" fill="#17231d"/><g fill="none" stroke="#364c3c" stroke-width="1"><path d="M0 80h640M0 160h640M0 240h640M160 0v320M320 0v320M480 0v320"/></g><path d="M65 235Q180 90 290 160T575 65" fill="none" stroke="#c9aa71" stroke-width="5" stroke-dasharray="9 9"/><g fill="#c9aa71"><circle cx="65" cy="235" r="8"/><circle cx="290" cy="160" r="8"/><circle cx="575" cy="65" r="8"/></g><text x="32" y="42" fill="#d8d7bc" font-family="Georgia" font-size="22">Imagen de ejemplo</text></svg>';
bootstrapApplication(App,{providers:[
  provideRouter([{path:'administracion',component:AdminHome},{path:'administracion/addons/nuevo',component:NewAddon},{path:'administracion/addons/:id/publicacion',component:Editorial},{path:'**',redirectTo:`administracion/addons/${addonId}/publicacion`}]),
  {provide:AdminAccess,useValue:{signOut:async()=>{throw new Error('Vista previa sin sesión.');}}},
  {provide:SupabaseAdminGateway,useValue:{
    loadEditorial:async()=>structuredClone(fixture),
    listEditorial:async()=>[structuredClone(fixture.addon)],
    loadCategories:async()=>({categories:[structuredClone(fixture.category)]}),
    createDraft:async()=>{throw new Error('Esta vista previa no guarda cambios.');},
    editorialImageBlob:async()=>new Blob([svg],{type:'image/svg+xml'}),
    editorialAction:async()=>{throw new Error('Esta vista previa no guarda cambios.');},
  }},
]}).catch(console.error);
