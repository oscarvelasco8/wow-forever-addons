import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { test } from 'node:test';
import { PGlite } from '@electric-sql/pglite';

// PostgreSQL executes the real migrations. Only Supabase-owned infrastructure is
// represented here; this is not an integration test of GoTrue, PostgREST or Storage.
const bootstrap = `
  create role anon nologin;
  create role authenticated nologin;
  create role service_role nologin bypassrls;
  create schema auth;
  create table auth.users (id uuid primary key);
  create function auth.uid() returns uuid language sql stable as $$
    select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
  $$;
  create function auth.jwt() returns jsonb language sql stable as $$
    select jsonb_build_object('aal', coalesce(current_setting('request.jwt.claim.aal', true), 'aal1'));
  $$;
  grant usage on schema auth to anon, authenticated;
  grant execute on function auth.uid() to anon, authenticated;
  create schema storage;
  create table storage.buckets (
    id text primary key, name text not null, public boolean not null default false,
    file_size_limit bigint, allowed_mime_types text[]
  );
  create table storage.objects (
    id uuid primary key default gen_random_uuid(),
    bucket_id text references storage.buckets(id), name text not null,
    unique (bucket_id, name)
  );
  alter table storage.objects enable row level security;
  grant usage on schema public, storage to anon, authenticated;
  grant select on storage.objects to anon;
  grant select, insert, update, delete on storage.objects to authenticated;
`;

const admin = '90000000-0000-4000-8000-000000000001';
const user = '90000000-0000-4000-8000-000000000002';
const addon = '20000000-0000-4000-8000-000000000001';
const draftAddon = '20000000-0000-4000-8000-000000000002';
const release = '30000000-0000-4000-8000-000000000001';
const draftRelease = '30000000-0000-4000-8000-000000000002';
const image = '40000000-0000-4000-8000-000000000001';
const publishedPath = `${addon}/${release}.zip`;
const draftPath = `${addon}/${draftRelease}.zip`;

test('catalog migrations and publication permissions in PostgreSQL', async (context) => {
  const db = new PGlite();
  context.after(() => db.close());
  await db.exec(bootstrap);
  const migrations = (await readdir(new URL('../../supabase/migrations/', import.meta.url)))
    .filter((name) => name.endsWith('.sql')).sort();
  for (const migration of migrations) {
    await db.exec(await readFile(new URL(`../../supabase/migrations/${migration}`, import.meta.url), 'utf8'));
  }
  const seed = await readFile(new URL('../../supabase/seed.sql', import.meta.url), 'utf8');
  await db.exec(seed);
  await db.exec(seed); // Seeds must not duplicate metadata when replayed.

  const asRole = async (role, subject, sql, params = []) => {
    assert.ok(['anon', 'authenticated'].includes(role));
    return db.transaction(async (tx) => {
      await tx.exec(`set local role ${role}`);
      await tx.query("select set_config('request.jwt.claim.sub', $1, true)", [subject ?? '']);
      await tx.query("select set_config('request.jwt.claim.aal', $1, true)", [subject === admin ? 'aal2' : 'aal1']);
      return tx.query(sql, params);
    });
  };
  const anonymous = (sql, params) => asRole('anon', null, sql, params);
  const signedIn = (sql, params) => asRole('authenticated', user, sql, params);
  const administrator = (sql, params) => asRole('authenticated', admin, sql, params);

  await db.query('insert into auth.users(id) values ($1), ($2)', [admin, user]);
  await db.query('insert into private.admin_users(user_id) values ($1)', [admin]);

  await context.test('membership alone does not grant draft access or writes without MFA', async () => {
    await db.transaction(async (tx) => {
      await tx.exec('set local role authenticated');
      await tx.query("select set_config('request.jwt.claim.sub', $1, true)", [admin]);
      await tx.exec("select set_config('request.jwt.claim.aal', 'aal1', true)");
      assert.equal((await tx.query('select public.admin_access() as decision')).rows[0].decision, 'mfa-required');
      assert.equal((await tx.query('select * from public.addons')).rows.length, 0);
      assert.equal((await tx.query("update public.addons set name='Bad' returning id")).rows.length, 0);
    });
    await assert.rejects(anonymous('select public.admin_access()'));
    assert.equal((await signedIn('select public.admin_access() as decision')).rows[0].decision, 'forbidden');
    assert.equal((await administrator('select public.admin_access() as decision')).rows[0].decision, 'admin');
  });

  await context.test('seed is idempotent and Rumbo starts as an invisible draft', async () => {
    assert.equal((await db.query('select count(*)::int as n from public.addons')).rows[0].n, 1);
    assert.equal((await anonymous('select * from public.addons')).rows.length, 0);
    assert.equal((await administrator('select * from public.addons')).rows.length, 1);
  });

  await context.test('anonymous and ordinary users cannot insert or promote themselves', async () => {
    await assert.rejects(anonymous("insert into public.categories(slug,name) values ('bad','Bad')"));
    await assert.rejects(signedIn("insert into public.categories(slug,name) values ('bad','Bad')"));
    await assert.rejects(signedIn('insert into private.admin_users(user_id) values ($1)', [user]));
    await assert.rejects(administrator('insert into private.admin_users(user_id) values ($1)', [user]));
    assert.equal((await signedIn('select private.is_admin() as allowed')).rows[0].allowed, false);
  });

  await context.test('admin may edit content but cannot publish unreviewed distribution', async () => {
    await assert.rejects(administrator("update public.addons set status='published', published_at=now() where id=$1", [addon]));
    const result = await administrator("update public.addons set description='Reviewed text' where id=$1 returning description", [addon]);
    assert.equal(result.rows[0].description, 'Reviewed text');
  });

  await context.test('installation instructions inherit RLS and enforce the storage limit', async () => {
    await assert.rejects(administrator('update public.addons set installation_instructions=$1 where id=$2', ['x'.repeat(30001), addon]));
    const updated = await administrator('update public.addons set installation_instructions=$1 where id=$2 returning installation_instructions', ['Pasos propios de este addon', addon]);
    assert.equal(updated.rows[0].installation_instructions, 'Pasos propios de este addon');
    assert.equal((await anonymous('select installation_instructions from public.addons')).rows.length, 0);
    assert.equal((await signedIn('update public.addons set installation_instructions=$1 where id=$2 returning id', ['Intrusión', addon])).rows.length, 0);
  });

  await administrator("update public.addons set distribution_approved=true, status='published', published_at=now() where id=$1", [addon]);
  await db.query(`insert into public.addons (id,slug,name,category_id,summary,author_name)
    select $1,'another-addon','Another addon',category_id,'Another independent draft','Author'
    from public.addons where id=$2`, [draftAddon, addon]);

  await context.test('public visitors see only published addons and cannot update/delete them', async () => {
    assert.deepEqual((await anonymous('select slug from public.addons')).rows.map((row) => row.slug), ['rumbo']);
    assert.equal((await signedIn("update public.addons set name='Changed' where id=$1 returning id", [addon])).rows.length, 0);
    assert.equal((await signedIn('delete from public.addons where id=$1 returning id', [addon])).rows.length, 0);
    await assert.rejects(anonymous("update public.addons set name='Changed' where id=$1", [addon]));
  });

  await context.test('a release cannot be published without a canonical file, checksum and size', async () => {
    await assert.rejects(administrator("update public.addon_releases set status='published',published_at=now() where addon_id=$1", [addon]));
    await assert.rejects(administrator("update public.addon_releases set file_path='../other.zip' where addon_id=$1", [addon]));
  });

  await db.query('delete from public.addon_releases where addon_id=$1', [addon]);
  await db.query(`insert into public.addon_releases
    (id,addon_id,version,game_version,interface_version,status,file_path,file_size_bytes,sha256,published_at)
    values ($1,$2,'0.3.0','1.60.1',16001,'published',$3,1000,$4,now()),
           ($5,$2,'0.4.0','1.60.1',16001,'draft',$6,1000,$4,null)`,
  [release, addon, publishedPath, 'a'.repeat(64), draftRelease, draftPath]);
  await db.query(`insert into public.addon_images(id,addon_id,file_path,alt_text,is_published)
    values ($1,$2,$3,'Test image',true)`, [image, addon, `${addon}/${image}.webp`]);
  await db.query("insert into storage.buckets (id,name,public) values ('unrelated','unrelated',false)");
  await db.query(`insert into storage.objects(bucket_id,name) values
    ('addon-files',$1),('addon-files',$2),('addon-files','unregistered.zip'),
    ('addon-images',$3),('unrelated','private.txt')`, [publishedPath, draftPath, `${addon}/${image}.webp`]);

  await context.test('free access requires no login and hides draft or unregistered objects', async () => {
    assert.equal((await anonymous('select * from public.addon_releases')).rows.length, 1);
    assert.equal((await anonymous('select * from public.addon_images')).rows.length, 1);
    const objects = (await anonymous('select name from storage.objects order by name')).rows;
    assert.deepEqual(objects.map((row) => row.name).sort(), [publishedPath, `${addon}/${image}.webp`].sort());
    assert.equal((await anonymous('select * from storage.objects where name=$1', [draftPath])).rows.length, 0);
  });

  await context.test('password-only administrator cannot see draft files or upload objects', async () => {
    const lowAssurance = (sql) => db.transaction(async (tx) => {
      await tx.exec('set local role authenticated');
      await tx.query("select set_config('request.jwt.claim.sub', $1, true)", [admin]);
      await tx.exec("select set_config('request.jwt.claim.aal', 'aal1', true)");
      return tx.query(sql);
    });
    assert.equal((await lowAssurance('select count(*)::int as total from storage.objects')).rows[0].total, 2);
    await assert.rejects(lowAssurance("insert into storage.objects(bucket_id,name) values ('addon-files','blocked.zip')"));
  });

  await context.test('ordinary users cannot upload; admin storage access is limited to our buckets', async () => {
    await assert.rejects(signedIn("insert into storage.objects(bucket_id,name) values ('addon-files','intruder.zip')"));
    assert.equal((await administrator('select * from storage.objects')).rows.length, 4);
    await assert.rejects(administrator("insert into storage.objects(bucket_id,name) values ('unrelated','intruder.zip')"));
    const result = await administrator("insert into storage.objects(bucket_id,name) values ('addon-files','staged.zip') returning name");
    assert.equal(result.rows[0].name, 'staged.zip');
  });

  await context.test('archiving a release hides its object but leaves published images visible', async () => {
    await administrator("update public.addon_releases set status='archived' where id=$1", [release]);
    assert.equal((await anonymous("select * from storage.objects where bucket_id='addon-files'")).rows.length, 0);
    assert.equal((await anonymous("select * from storage.objects where bucket_id='addon-images'")).rows.length, 1);
    await administrator("update public.addon_releases set status='published' where id=$1", [release]);
  });

  await context.test('a published child of a different draft addon cannot leak through another public addon', async () => {
    const hiddenRelease = '30000000-0000-4000-8000-000000000003';
    const hiddenPath = `${draftAddon}/${hiddenRelease}.zip`;
    await db.query(`insert into public.addon_releases
      (id,addon_id,version,game_version,interface_version,status,file_path,file_size_bytes,sha256,published_at)
      values ($1,$2,'0.1.0','1.60.1',16001,'published',$3,1000,$4,now())`,
    [hiddenRelease, draftAddon, hiddenPath, 'b'.repeat(64)]);
    await db.query("insert into storage.objects(bucket_id,name) values ('addon-files',$1)", [hiddenPath]);
    assert.equal((await anonymous('select * from public.addon_releases where id=$1', [hiddenRelease])).rows.length, 0);
    assert.equal((await anonymous('select * from storage.objects where name=$1', [hiddenPath])).rows.length, 0);
  });

  await context.test('parent draft status hides all descendant metadata and objects', async () => {
    await administrator("update public.addons set status='draft' where id=$1", [addon]);
    for (const table of ['addon_releases', 'addon_images']) {
      assert.equal((await anonymous(`select * from public.${table}`)).rows.length, 0);
    }
    assert.equal((await anonymous('select * from storage.objects')).rows.length, 0);
    await administrator("update public.addons set status='published' where id=$1", [addon]);
  });

  await context.test('future publication and hidden categories do not leak files', async () => {
    await administrator("update public.addons set published_at=now()+interval '1 day' where id=$1", [addon]);
    assert.equal((await anonymous('select * from storage.objects')).rows.length, 0);
    await administrator('update public.addons set published_at=now() where id=$1', [addon]);
    await administrator('update public.categories set is_visible=false');
    assert.equal((await anonymous('select * from public.addons')).rows.length, 0);
    assert.equal((await anonymous('select * from storage.objects')).rows.length, 0);
    await administrator('update public.categories set is_visible=true');
  });

  await context.test('buckets remain private and every application table has RLS enabled', async () => {
    assert.equal((await db.query("select count(*)::int as n from storage.buckets where id in ('addon-files','addon-images') and public")).rows[0].n, 0);
    const tables = await db.query(`select relname from pg_class c join pg_namespace n on n.oid=c.relnamespace
      where n.nspname in ('public','private') and c.relkind='r' and not c.relrowsecurity`);
    assert.deepEqual(tables.rows, []);
  });

  await context.test('editorial RPC protects transitions, concurrency and immutable journal', async () => {
    const editorialAddon='20000000-0000-4000-8000-000000000099';
    const editorialRelease='30000000-0000-4000-8000-000000000099';
    const editorialImage='40000000-0000-4000-8000-000000000099';
    await administrator(`insert into public.addons(id,slug,name,category_id,summary,author_name,license_name)
      select $1,'editorial-test','Editorial',category_id,'Test','Author','MIT' from public.addons where id=$2`,[editorialAddon,addon]);
    await administrator(`insert into public.addon_releases(id,addon_id,version,game_version,interface_version)
      values ($1,$2,'1','1',1)`,[editorialRelease,editorialAddon]);
    const stamp=async(table,id)=>(await administrator(`select updated_at from public.${table} where id=$1`,[id])).rows[0].updated_at;
    const call=async(entity,id,action,extra={})=>administrator(
      'select public.editorial_action($1,$2,$3,$4,$5,$6,$7,$8) as value',
      [editorialAddon,entity,id,extra.stamp ?? await stamp(entity==='addon'?'addons':entity==='release'?'addon_releases':'addon_images',id),action,'Revisión de prueba documentada',extra.alt??null,extra.order??null]);
    const args=[editorialAddon,'addon',editorialAddon,await stamp('addons',editorialAddon),'approve','Revisión de prueba documentada'];
    await assert.rejects(anonymous('select public.editorial_action($1,$2,$3,$4,$5,$6)',args));
    await assert.rejects(signedIn('select public.editorial_action($1,$2,$3,$4,$5,$6)',args));
    await assert.rejects(db.transaction(async tx=>{
      await tx.exec('set local role authenticated');
      await tx.query("select set_config('request.jwt.claim.sub',$1,true)",[admin]);
      await tx.exec("select set_config('request.jwt.claim.aal','aal1',true)");
      await tx.query('select public.editorial_action($1,$2,$3,$4,$5,$6)',args);
    }));
    await assert.rejects(call('release',editorialRelease,'publish'));
    const old=await stamp('addons',editorialAddon);
    await call('addon',editorialAddon,'approve');
    await assert.rejects(call('addon',editorialAddon,'publish',{stamp:old}));
    await assert.rejects(call('addon',editorialAddon,'publish'));
    await assert.rejects(call('release',editorialRelease,'publish')); // No blob or metadata.
    await administrator(`update public.addon_releases set file_path=$1,file_size_bytes=100,sha256=$2 where id=$3`,[`${editorialAddon}/${editorialRelease}.zip`,'a'.repeat(64),editorialRelease]);
    await assert.rejects(call('release',editorialRelease,'publish')); // Metadata alone is insufficient.
    await administrator("insert into storage.objects(bucket_id,name) values ('addon-files',$1)",[`${editorialAddon}/${editorialRelease}.zip`]);
    await call('release',editorialRelease,'publish');
    assert.equal((await anonymous('select id from public.addon_releases where id=$1',[editorialRelease])).rows.length,0);
    await administrator('update public.categories set is_visible=false where id=(select category_id from public.addons where id=$1)',[editorialAddon]);
    await assert.rejects(call('addon',editorialAddon,'publish'),/EDITORIAL_CATEGORY_HIDDEN/);
    await administrator('update public.categories set is_visible=true where id=(select category_id from public.addons where id=$1)',[editorialAddon]);
    await call('addon',editorialAddon,'publish');
    assert.equal((await anonymous('select id from public.addon_releases where id=$1',[editorialRelease])).rows.length,1);
    await administrator('insert into public.addon_images(id,addon_id,file_path,alt_text) values ($1,$2,$3,$4)',[editorialImage,editorialAddon,`${editorialAddon}/${editorialImage}.png`,'Original']);
    await call('image',editorialImage,'edit',{alt:'Imagen accesible',order:3});
    await assert.rejects(call('image',editorialImage,'publish'));
    await administrator("insert into storage.objects(bucket_id,name) values ('addon-images',$1)",[`${editorialAddon}/${editorialImage}.png`]);
    await call('image',editorialImage,'publish');
    const events=await administrator('select * from public.editorial_events where addon_id=$1 order by occurred_at',[editorialAddon]);
    assert.ok(events.rows.some(e=>e.actor_id===admin && e.note==='Revisión de prueba documentada' && e.after_data?.is_published));
    assert.equal((await signedIn('select * from public.editorial_events')).rows.length,0);
    await assert.rejects(anonymous('select * from public.editorial_events'));
    await assert.rejects(administrator('delete from public.editorial_events'));
    await assert.rejects(administrator("update public.editorial_events set note='tampered'"));
    await assert.rejects(administrator("insert into public.editorial_events(addon_id,entity,entity_id,operation) values ($1,'addons',$1,'UPDATE')",[editorialAddon]));
    await call('addon',editorialAddon,'withdraw');
    assert.equal((await anonymous('select id from public.addons where id=$1',[editorialAddon])).rows.length,0);
    assert.equal((await administrator('select status from public.addon_releases where id=$1',[editorialRelease])).rows[0].status,'archived');
    assert.equal((await administrator('select is_published from public.addon_images where id=$1',[editorialImage])).rows[0].is_published,false);
    await call('release',editorialRelease,'draft');
    await assert.rejects(call('release',editorialRelease,'publish')); // Approval reset by parent withdrawal.
  });

  await context.test('catalog pages use a stable cursor, accent-insensitive literal search and public RLS',async()=>{
    const c=(await db.query("insert into public.categories(slug,name,is_visible) values ('page-test','Exploración',true) returning id")).rows[0].id;
    await db.query(`insert into public.addons(slug,name,category_id,summary,description,author_name,status,distribution_approved,published_at)
      select 'page-'||lpad(n::text,2,'0'),'Navegación', $1,'Vuelos del bosque','Texto de prueba','Autor','published',true,now() from generate_series(1,14) n`,[c]);
    await db.query("insert into public.addons(slug,name,category_id,summary,author_name) values ('page-hidden','Navegación',$1,'Vuelos del bosque','Autor')",[c]);
    const first=(await anonymous("select slug,name from public.catalog_page('navegacion vuelos','page-test',null,null,13)")).rows;
    assert.equal(first.length,13);assert.equal(first[0].slug,'page-01');assert.equal(first[12].slug,'page-13');
    const next=(await anonymous('select slug from public.catalog_page($1,$2,$3,$4,13)',['navegacion vuelos','page-test',first[11].name,first[11].slug])).rows;
    assert.deepEqual(next.map(row=>row.slug),['page-13','page-14']);
    assert.equal((await anonymous("select slug from public.catalog_page('vuelos%','page-test')")).rows.length,0);
    assert.equal((await administrator("select slug from public.catalog_page('','page-test') where slug='page-hidden'")).rows.length,0);
    await assert.rejects(anonymous("select * from public.catalog_page('','',null,null,1000)"));
    await assert.rejects(anonymous("select * from public.catalog_page('','','Only name',null,13)"));
    await db.query('update public.categories set is_visible=false where id=$1',[c]);
    assert.equal((await anonymous("select slug from public.catalog_page('','page-test')")).rows.length,0);
  });

  await context.test('categories are created hidden, ordered and audited, and updates require MFA and the original timestamp',async()=>{
    const args=['Categoría de prueba','category-test',12,false,'Creación para comprobar categorías'];
    const sql='select public.save_category($1,$2,$3,$4,$5) as value';
    await assert.rejects(anonymous(sql,args));await assert.rejects(signedIn(sql,args));
    await assert.rejects(db.transaction(async tx=>{
      await tx.exec('set local role authenticated');await tx.query("select set_config('request.jwt.claim.sub',$1,true)",[admin]);await tx.exec("select set_config('request.jwt.claim.aal','aal1',true)");await tx.query(sql,args);
    }));
    await assert.rejects(administrator(sql,[...args.slice(0,3),true,args[4]]));
    await assert.rejects(administrator(sql,['','invalid slug',-1,false,'short']));
    const created=(await administrator(sql,args)).rows[0].value;
    assert.equal(created.is_visible,false);assert.equal(created.sort_order,12);
    assert.equal((await anonymous('select id from public.categories where id=$1',[created.id])).rows.length,0);
    const updated=(await administrator('select public.save_category($1,$2,$3,$4,$5,$6,$7) as value',['Categoría revisada','category-test',2,true,'Revisada y visible en catálogo',created.id,created.updated_at])).rows[0].value;
    assert.equal((await anonymous('select sort_order from public.categories where id=$1',[created.id])).rows[0].sort_order,2);
    await assert.rejects(administrator('select public.save_category($1,$2,$3,$4,$5,$6,$7)', ['Cambio obsoleto','category-test',1,false,'Edición de prueba desactualizada',created.id,created.updated_at]),/CATEGORY_CONFLICT/);
    await assert.rejects(administrator(sql,args)); // Unique slug still enforced.
    const events=(await administrator("select * from public.editorial_events where entity='categories' and entity_id=$1 order by occurred_at",[created.id])).rows;
    assert.equal(events.length,2);assert.ok(events.every(e=>e.addon_id===null&&e.actor_id===admin));
    assert.equal(events[1].after_data.is_visible,true);assert.equal(events[1].note,'Revisada y visible en catálogo');
    assert.equal(updated.name,'Categoría revisada');
    // Visibility hides descendants without changing their publication or approval.
    const category=(await administrator('select * from public.categories where id=(select category_id from public.addons where id=$1)',[addon])).rows[0];
    await administrator('select public.save_category($1,$2,$3,false,$4,$5,$6)',[category.name,category.slug,category.sort_order,'Ocultar categoría de prueba',category.id,category.updated_at]);
    assert.equal((await anonymous('select id from public.addons where id=$1',[addon])).rows.length,0);
    assert.equal((await administrator('select status from public.addons where id=$1',[addon])).rows[0].status,'published');
  });

  await context.test('asset revisions preserve referenced bytes, retire paths and protect publication and concurrency',async()=>{
    const a='81000000-0000-4000-8000-000000000001',r='82000000-0000-4000-8000-000000000001',im='83000000-0000-4000-8000-000000000001';
    const old=`${a}/${r}.zip`,fresh=`${a}/${r}/84000000-0000-4000-8000-000000000001.zip`;
    await administrator("insert into public.addons(id,category_id,slug,name,summary,author_name) select $1,category_id,'asset-revision-test','Asset test','Resumen','Autor' from public.addons where id=$2",[a,addon]);
    await administrator("insert into public.addon_releases(id,addon_id,version,game_version,interface_version,file_path,file_size_bytes,sha256) values($1,$2,'1','Test',1,$3,10,$4)",[r,a,old,'a'.repeat(64)]);
    await administrator("insert into storage.objects(bucket_id,name) values('addon-files',$1),('addon-files',$2)",[old,fresh]);
    assert.equal((await administrator("update storage.objects set name=name where bucket_id='addon-files' and name=$1 returning name",[old])).rows.length,0);
    assert.equal((await administrator("delete from storage.objects where bucket_id='addon-files' and name=$1 returning name",[old])).rows.length,0);
    const stamp=(await administrator('select updated_at from public.addon_releases where id=$1',[r])).rows[0].updated_at;
    const args=[a,'release',r,stamp,fresh,20,'b'.repeat(64),'Reemplazo local revisado'];
    const sql='select public.change_draft_asset($1,$2,$3,$4,$5,$6,$7,$8) as value';
    await assert.rejects(signedIn(sql,args));await assert.rejects(anonymous(sql,args));
    const changed=(await administrator(sql,args)).rows[0].value;assert.equal(changed.file_path,fresh);
    await assert.rejects(administrator(sql,args),/ASSET_CONFLICT/);
    await assert.rejects(administrator('update public.addon_releases set file_path=$1 where id=$2',[old,r]),/ASSET_PATH_RETIRED/);
    assert.equal((await administrator("delete from storage.objects where bucket_id='addon-files' and name=$1 returning name",[old])).rows.length,1);
    await assert.rejects(administrator("insert into storage.objects(bucket_id,name) values('addon-files',$1)",[old]));
    await administrator("update public.addon_releases set status='published',published_at=now() where id=$1",[r]);
    const published=(await administrator('select updated_at from public.addon_releases where id=$1',[r])).rows[0].updated_at;
    await assert.rejects(administrator(sql,[a,'release',r,published,null,null,null,'Eliminar publicado rechazado']),/ASSET_CONFLICT/);
    await assert.rejects(administrator('delete from public.addon_releases where id=$1',[r]),/ASSET_PUBLISHED_PROTECTED/);
    await administrator("insert into public.addon_images(id,addon_id,file_path,alt_text) values($1,$2,$3,'Imagen de prueba')",[im,a,`${a}/${im}.png`]);
    await administrator("insert into storage.objects(bucket_id,name) values('addon-images',$1)",[`${a}/${im}.png`]);
    const imageStamp=(await administrator('select updated_at from public.addon_images where id=$1',[im])).rows[0].updated_at;
    await administrator(sql,[a,'image',im,imageStamp,null,null,null,'Eliminar imagen de prueba']);
    const pending=(await administrator('select public.draft_asset_status($1) as value',[a])).rows[0].value;
    assert.equal(pending.pending.length,1);assert.equal(pending.pending[0].path,`${a}/${im}.png`);
    const r2='82000000-0000-4000-8000-000000000002',p2=`${a}/${r2}.zip`;
    await administrator("insert into public.addon_releases(id,addon_id,version,game_version,interface_version,file_path,file_size_bytes,sha256) values($1,$2,'2','Test',1,$3,10,$4)",[r2,a,p2,'a'.repeat(64)]);
    await administrator("insert into storage.objects(bucket_id,name) values('addon-files',$1)",[p2]);
    const s2=(await administrator('select updated_at from public.addon_releases where id=$1',[r2])).rows[0].updated_at;
    const detached=(await administrator(sql,[a,'release',r2,s2,null,null,null,'Retirar ZIP conservando versión'])).rows[0].value;
    assert.equal(detached.file_path,null);assert.equal(detached.sha256,null);assert.equal(detached.file_size_bytes,null);
    assert.equal((await administrator("delete from storage.objects where bucket_id='addon-files' and name=$1 returning name",[p2])).rows.length,1);
    const probe='_verification/0123456789abcdef0123456789abcdef/probe.zip';
    await administrator("insert into storage.objects(bucket_id,name) values('addon-files',$1)",[probe]);
    assert.equal((await administrator("delete from storage.objects where bucket_id='addon-files' and name=$1 returning name",[probe])).rows.length,1);
    assert.ok((await administrator('select count(*)::int as n from public.editorial_events where addon_id=$1 and note=$2',[a,'Reemplazo local revisado'])).rows[0].n>0);
  });

  await context.test('revoking membership takes effect for the same authenticated subject', async () => {
    await db.query('delete from private.admin_users where user_id=$1', [admin]);
    assert.equal((await administrator('select private.is_admin() as allowed')).rows[0].allowed, false);
    await assert.rejects(administrator("insert into public.categories(slug,name) values ('revoked','Revoked')"));
  });

  await context.test('read-only deployment verification queries execute successfully', async () => {
    const result = await db.exec(await readFile(new URL('../../supabase/verify.sql', import.meta.url), 'utf8'));
    assert.equal(result[0].rows.length, 6);
    assert.ok(result[0].rows.every((row) => row.rls_enabled));
    assert.equal(result[1].rows.length, 2);
    assert.equal(result[2].rows.length, 0);
  });
});
