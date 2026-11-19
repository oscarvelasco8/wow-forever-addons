begin;
create function private.fold_catalog_search(value text) returns text
language sql immutable parallel safe security invoker set search_path='' as $$
  select translate(lower(value),'áàâäãåéèêëíìîïóòôöõúùûüñçýÿ','aaaaaaeeeeiiiiooooouuuuncyy');
$$;
revoke all on function private.fold_catalog_search(text) from public;
grant execute on function private.fold_catalog_search(text) to anon,authenticated;
create index addons_catalog_name_slug_idx on public.addons(name,slug) where status='published';
create function public.catalog_page(p_query text default '',p_category text default '',p_after_name text default null,p_after_slug text default null,p_limit integer default 13)
returns setof public.addons language plpgsql stable security invoker set search_path='' as $$
begin
  if p_query is null or length(p_query)>160 or p_category is null or length(p_category)>100
    or (p_category<>'' and p_category !~ '^[a-z0-9]+(-[a-z0-9]+)*$') or p_limit is null or p_limit not between 1 and 25
    or (p_after_name is null)<>(p_after_slug is null) or length(p_after_name)>100 or length(p_after_slug)>100
    or (p_after_slug is not null and p_after_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$') then
    raise exception 'Invalid catalog page' using errcode='22023';
  end if;
  return query select a.* from public.addons a join public.categories c on c.id=a.category_id
    where a.status='published' and a.distribution_approved and a.published_at<=now() and c.is_visible
      and (p_category='' or c.slug=p_category) and (p_after_name is null or (a.name,a.slug)>(p_after_name,p_after_slug))
      and not exists(select 1 from regexp_split_to_table(private.fold_catalog_search(trim(p_query)),'\s+') as words(term)
        where term<>'' and strpos(private.fold_catalog_search(concat_ws(' ',a.name,c.name,a.summary,a.description)),term)=0)
    order by a.name,a.slug limit p_limit;
end;
$$;
revoke all on function public.catalog_page(text,text,text,text,integer) from public;
grant execute on function public.catalog_page(text,text,text,text,integer) to anon,authenticated;
commit;
