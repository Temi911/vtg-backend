-- The previous version stored doubled backslashes, so word-stem patterns such as fuck-star never matched.
-- This version uses single backslashes, adds slurs and a few more phrases, and tests several spellings per message.
create or replace function private.vtg_message_content_violation(p_body text)
returns text language plpgsql immutable set search_path to '' as $function$
declare
  v text := translate(lower(coalesce(p_body,'')), '@$0!13', 'asoiie');
  n text;
  b text := '(^|[^[:alnum:]_])';
  e text := '([^[:alnum:]_]|$)';
begin
  foreach n in array array[
    regexp_replace(v, '(.)\1{2,}', '\1\1', 'g'),
    regexp_replace(v, '(.)\1+', '\1', 'g'),
    regexp_replace(regexp_replace(v, '([a-z])[_.*-]+(?=[a-z])', '\1', 'g'), '(.)\1{2,}', '\1\1', 'g')
  ] loop
    if n ~* (b||'(porn\w*|xxx|nudes?|naked pics?|blow ?job|hand ?job|anal sex|oral sex|sex ?tape|sex ?chat|cum ?shot|orgasm|horny|dick pics?|boobs?|pussy|penis|vagina|masturbat\w*|incest|fetish|escort services?|explicit (photos|pictures|images)|sexual (services|favou?rs|content|acts?)|hook ?up|have sex|sleep with me|send me nudes)'||e) then
      return 'sexual_content';
    end if;
    if n ~* (b||'(fuck\w*|motherfuck\w*|shit\w*|bullshit|bitch\w*|whore\w*|slut\w*|cunt\w*|asshole\w*|arsehole|bastard\w*|faggot\w*|fag|nigg(er|a)s?|dickhead|prick|wanker|twat|douche\w*|son of a bitch|piece of shit|go to hell|idiot|moron|retard\w*|stupid fool|go die|kill yourself|you are worthless)'||e) then
      return 'harassment_or_abuse';
    end if;
    if n ~* (b||'(violence|violent|murder\w*|kill\w*|shoot you|shoot him|shoot them|stab\w*|bomb you|torture\w*|rape\w*|behead\w*|massacre|bloodshed|terroris\w*|threaten you|hurt you|beat you up|burn you alive|slit your throat|break your (legs|neck|bones)|i will find you|you will die|you are dead|acid attack|make you disappear)'||e) then
      return 'threat_or_violence';
    end if;
  end loop;
  return null;
end;
$function$;
revoke all on function private.vtg_message_content_violation(text) from public, anon, authenticated;
