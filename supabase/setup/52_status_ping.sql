-- Part 52: make the live-status ping reach phones. Part 51's trigger sent its ping on topic "board:<id>" with event "status",
-- but phones join the hashed topic "af-<24 hex>" (sha256 of "af|p_board|<board id>", first 12 bytes) and listen for event "ping".
-- This sends the ping the way phones expect it. The ping carries only the sequence number and time, never a name or a status.
-- Safe to re-run.
create or replace function public.board_status_ping()
returns trigger language plpgsql security definer set search_path to 'public', 'realtime' as $$
declare r record;
begin
  for r in select board_id, max(seq) as seq, max(t) as t from new_rows group by board_id loop
    perform realtime.send(
      jsonb_build_object('s', '', 'k', 'p_board', 'seq', r.seq, 't', r.t),
      'ping',
      'af-' || encode(substring(sha256(convert_to('af|p_board|' || r.board_id, 'UTF8')) from 1 for 12), 'hex'),
      false);
  end loop;
  return null;
end $$;
