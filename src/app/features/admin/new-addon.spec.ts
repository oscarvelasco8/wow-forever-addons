import {TestBed} from '@angular/core/testing';
import {provideRouter} from '@angular/router';
import {NewAddon} from './new-addon';
import {SupabaseAdminGateway} from '../../core/auth/supabase-admin-gateway';
import {DraftCreationUncertainError} from '../../core/catalog/admin-drafts';
const id='11111111-1111-4111-8111-111111111111';
describe('New addon',()=>{
 const gateway={loadCategories:vi.fn(),createDraft:vi.fn()};
 beforeEach(()=>{vi.resetAllMocks();gateway.loadCategories.mockResolvedValue({categories:[{id,name:'Herramientas',is_visible:true}]});TestBed.configureTestingModule({providers:[provideRouter([]),{provide:SupabaseAdminGateway,useValue:gateway}]});});
 it('does not create on entry or invalid submit',async()=>{
  const f=TestBed.createComponent(NewAddon);await f.whenStable();await f.componentInstance.save();expect(gateway.createDraft).not.toHaveBeenCalled();expect(f.nativeElement.textContent).toContain('borrador');
 });
 it('keeps input and blocks another insert after an uncertain outcome',async()=>{
  const f=TestBed.createComponent(NewAddon);await f.whenStable();const p=f.componentInstance;
  p.form.patchValue({name:'Prueba',slug:'prueba',category_id:id,summary:'Resumen'});p.form.markAsDirty();
  gateway.createDraft.mockRejectedValue(new DraftCreationUncertainError());await p.save();await p.save();
  expect(gateway.createDraft).toHaveBeenCalledOnce();expect(gateway.createDraft.mock.calls[0][1].author_name).toBe('Equipo WoW Forever');expect(p.uncertain()).toBe(true);expect(p.form.controls.name.value).toBe('Prueba');expect(p.dirty).toBe(true);
 });
 it('prevents leaving during a write and warns for unsaved input',async()=>{
  const f=TestBed.createComponent(NewAddon);await f.whenStable();const p=f.componentInstance;p.saving.set(true);expect(p.canLeave()).toBe(false);p.saving.set(false);p.form.markAsDirty();const confirm=vi.spyOn(window,'confirm').mockReturnValue(false);expect(p.canLeave()).toBe(false);confirm.mockRestore();
 });
});
