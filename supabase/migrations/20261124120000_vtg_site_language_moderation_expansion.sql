-- Consistent VTG language moderation for chat messages, edits, trade-feed posts and comments.
-- Rejected text is not persisted; only a category event and warning count are retained.
create or replace function private.vtg_message_content_violation(p_body text)
returns text language plpgsql immutable set search_path to ''
as $function$
declare
  v text := lower(coalesce(p_body,''));
  n text;
  b text := '(^|[^[:alnum:]_])';
  e text := '([^[:alnum:]_]|$)';
begin
  -- Normalise common substitutions and repeated characters used to evade moderation.
  v := translate(v, '@$0!13', 'aaoiie');
  v := regexp_replace(v, '(.)\\1{2,}', '\\1\\1', 'g');
  v := regexp_replace(v, '(?<=[a-z])[_.*\\-]+(?=[a-z])', '', 'g');

  if v ~* (b||'(porn\\w*|xxx|nudes?|naked pics?|blow ?job|hand ?job|anal|oral sex|sex ?tape|sex ?chat|cum|orgasm|horny|dick pics?|boobs?|pussy|penis|vagina|masturbat\\w*|incest|fetish|escort|explicit (photos|pictures|images)|sexual (services|favou?rs|content|acts?)|hook ?up|have sex|sleep with me|send me nudes)'||e) then
    return 'sexual_content';
  end if;
  if v ~* (b||'(fuck\\w*|motherfuck\\w*|shit\\w*|bullshit|bitch\\w*|whore\\w*|slut\\w*|cunt\\w*|asshole\\w*|arsehole|bastard\\w*|faggot|fag|dickhead|prick|wanker|twat|douche\\w*|son of a bitch|piece of shit|go to hell|idiot|moron|retard\\w*|stupid fool|go die|kill yourself|you are worthless)'||e) then
    return 'harassment_or_abuse';
  end if;
  if v ~* (b||'(violence|violent|murder\\w*|kill\\w*|shoot\\w*|stab\\w*|bomb\\w*|explos\\w*|tortur\\w*|assault\\w*|attack\\w*|rape\\w*|behead\\w*|massacre|bloodshed|terroris\\w*|threaten\\w*|hurt you|beat you up|burn you alive|slit your throat|break your (legs|neck|bones)|i will find you|you will die|you are dead|acid attack|make you disappear)'||e) then
    return 'threat_or_violence';
  end if;
  return null;
end;
$function$;
revoke all on function private.vtg_message_content_violation(text) from public,anon,authenticated;
