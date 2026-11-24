-- Wider vulgar / sexual / violent language list for chat moderation. Same return categories as before,
-- so vtg_send_message keeps blocking the message and recording a warning. Normalises common letter swaps.
create or replace function private.vtg_message_content_violation(p_body text)
returns text language plpgsql immutable set search_path to '' as $function$
declare
  v text := lower(coalesce(p_body,''));
  n text;
  b text := '(^|[^[:alnum:]_])';
  e text := '([^[:alnum:]_]|$)';
begin
  v := translate(v, '@$0!1', 'aaoii');
  foreach n in array array[
    regexp_replace(v, '(.)\1{2,}', '\1\1', 'g'),
    regexp_replace(v, '(.)\1+', '\1', 'g'),
    regexp_replace(regexp_replace(v, '(?<=[a-z])[_.*\-]+(?=[a-z])', '', 'g'), '(.)\1{2,}', '\1\1', 'g')
  ] loop
  if n ~* (b||'(porn\w*|xxx|nudes?|blow ?job|hand ?job|anal sex|oral sex|sex ?tape|sex ?chat|cum ?shot|orgasm|horny|dick pics?|boobs?|pussy|penis|vagina|masturbat\w*|incest|fetish|escort services?|send me (nudes|naked pictures)|explicit (photos|pictures|images)|sexual (services|favou?rs|content)|hook ?up|let''?s have sex|sleep with me)'||e) then
    return 'sexual_content';
  end if;
  if n ~* (b||'(bitch\w*|whore\w*|slut\w*|faggot|fag|retard\w*|cunt\w*|motherfuck\w*|fuck\w*|shit\w*|bullshit|asshole\w*|arsehole|bastard|dickhead|prick|wanker|twat|douche\w*|moron|idiot|stupid fool|son of a bitch|go die|kill yourself|you are worthless|piece of shit)'||e) then
    return 'harassment_or_abuse';
  end if;
  if n ~* (b||'(i will kill you|i''?ll kill you|kill you|kill him|kill her|kill them|murder you|hurt you|shoot you|stab you|rape you|rape her|beat you up|bomb you|burn you alive|slit your throat|break your (legs|neck|bones)|i will find you|you will die|you are dead|massacre|behead\w*|torture you|acid attack|make you disappear)'||e) then
    return 'threat_or_violence';
  end if;
  end loop;
  return null;
end;
$function$;
revoke all on function private.vtg_message_content_violation(text) from public, anon, authenticated;
