import { bootstrapApplication } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { App } from '../../src/app/app';
import { AdminCategories } from '../../src/app/features/admin/categories';
import { SupabaseAdminGateway } from '../../src/app/core/auth/supabase-admin-gateway';
import type { CategoryBundle } from '../../src/app/core/catalog/admin-categories';
const stamp='2026-11-19T10:00:00Z';
const fixture:CategoryBundle={categories:[
  {id:'11111111-1111-4111-8111-111111111111',name:'Exploración',slug:'exploracion',sort_order:1,is_visible:true,created_at:stamp,updated_at:stamp},
  {id:'22222222-2222-4222-8222-222222222222',name:'Utilidades',slug:'utilidades',sort_order:2,is_visible:false,created_at:stamp,updated_at:stamp},
  {id:'33333333-3333-4333-8333-333333333333',name:'Interfaz',slug:'interfaz',sort_order:3,is_visible:true,created_at:stamp,updated_at:stamp},
],events:[]};
bootstrapApplication(App,{providers:[
  provideRouter([{path:'administracion/categorias',component:AdminCategories},{path:'**',redirectTo:'administracion/categorias'}]),
  {provide:SupabaseAdminGateway,useValue:{loadCategories:async()=>structuredClone(fixture),saveCategory:async()=>{throw new Error('Esta vista previa no guarda cambios.');}}},
]}).catch(console.error);
