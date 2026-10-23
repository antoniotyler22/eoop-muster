do $$
declare t record;
begin
  for t in select * from (values
    ('recalls',300),('checkins',6000),('boards',200),('board_updates',3000),('board_cal',3000),
    ('feeds',200),('feed_posts',1000),('feed_acks',6000),('feed_subs',2000),('feed_reqs',1000),
    ('backups',300),('my_pages',3000)) as x(tbl, lim)
  loop
    if to_regclass('public.'||t.tbl) is not null then
      execute format('drop trigger if exists rl_%1$s on public.%1$I', t.tbl);
      execute format('create trigger rl_%1$s before insert on public.%1$I for each row execute function public.rl_guard(%2$L)', t.tbl, t.lim::text);
    end if;
  end loop;
end $$;
