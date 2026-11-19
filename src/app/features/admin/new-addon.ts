import {ChangeDetectionStrategy,Component,HostListener,inject,signal} from '@angular/core';
import {NonNullableFormBuilder,ReactiveFormsModule,Validators} from '@angular/forms';
import {Router,RouterLink} from '@angular/router';
import {SupabaseAdminGateway} from '../../core/auth/supabase-admin-gateway';
import {DraftCreationUncertainError,DraftValidationError} from '../../core/catalog/admin-drafts';
import type {Category} from '../../core/catalog/admin-categories';
import {PageSeo} from '../../core/seo/page-seo';

@Component({selector:'app-new-addon',imports:[ReactiveFormsModule,RouterLink],templateUrl:'./new-addon.html',styleUrl:'./draft-editor.scss',changeDetection:ChangeDetectionStrategy.OnPush})
export class NewAddon {
 private readonly gateway=inject(SupabaseAdminGateway);
 private readonly router=inject(Router);
 private readonly fb=inject(NonNullableFormBuilder);
 private readonly attemptId=crypto.randomUUID();
 readonly categories=signal<Category[]>([]);
 readonly loading=signal(true);readonly saving=signal(false);readonly error=signal('');
 readonly uncertain=signal(false);readonly created=signal('');
 readonly form=this.fb.group({name:['',[Validators.required,Validators.maxLength(100)]],slug:['',[Validators.required,Validators.maxLength(100),Validators.pattern(/^[a-z0-9]+(-[a-z0-9]+)*$/)]],category_id:['',Validators.required],summary:['',[Validators.required,Validators.maxLength(300)]],author_name:['',[Validators.required,Validators.maxLength(150)]],license_name:['Pendiente de revisión',[Validators.required,Validators.maxLength(150)]]});
 constructor(){inject(PageSeo).update({title:'Nuevo addon | WoW Forever Addons',description:'Crear una ficha privada en borrador.',path:'/administracion/addons/nuevo',noindex:true});void this.load();}
 get dirty(){return this.form.dirty&&!this.created();}
 @HostListener('window:beforeunload',['$event']) beforeUnload(event:BeforeUnloadEvent){if(this.dirty||this.saving()){event.preventDefault();event.returnValue='';}}
 canLeave(){return !this.saving()&&(!this.dirty||window.confirm('Hay cambios sin guardar. ¿Quieres salir y descartarlos?'));}
 async load(){this.loading.set(true);this.error.set('');try{this.categories.set((await this.gateway.loadCategories()).categories);}catch{this.error.set('No se pudieron cargar las categorías. Comprueba tu sesión y vuelve a intentarlo.');}finally{this.loading.set(false);}}
 async save(){
  if(this.loading()||this.saving()||this.uncertain()||this.created())return;
  this.form.markAllAsTouched();if(this.form.invalid){this.error.set('Revisa los campos obligatorios y la dirección de la ficha.');return;}
  this.saving.set(true);this.error.set('');
  try{
   const addon=await this.gateway.createDraft(this.attemptId,{...this.form.getRawValue(),description:'',credits:'',installation_instructions:''});
   this.created.set(addon.id);this.form.markAsPristine();this.saving.set(false);
   await this.router.navigate(['/administracion/addons',addon.id]);
  }catch(error){
   if(this.created()){this.error.set('El borrador está creado. Abre el editor con el enlace inferior.');}
   else if(error instanceof DraftCreationUncertainError){this.uncertain.set(true);this.error.set('No se ha podido confirmar la creación. Vuelve al listado y comprueba si aparece antes de crear otro addon.');}
   else{this.error.set(error instanceof DraftValidationError?'Revisa los campos obligatorios y la dirección.':error instanceof Error?error.message:'No se pudo crear el borrador.');}
  }finally{this.saving.set(false);}
 }
}
