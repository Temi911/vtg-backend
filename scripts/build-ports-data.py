#!/usr/bin/env python3
"""Builds /vtg-ports-data.js: seaports and airports of Africa, China and South Korea.

Sources (both public-domain / open data, downloaded from GitHub):
  * Airports: OurAirports (https://github.com/davidmegginson/ourairports-data) - public domain.
    Scheduled-service airports with an IATA code; longest runway from runways.csv.
  * Seaports: NGA World Port Index (Pub. 150, 2019 edition) via https://github.com/tayljordan/ports (ports.json).
    NGA data is US-government public domain. Depth soundings are deliberately NOT copied: the source says they may be wrong.

Usage:  python3 -I scripts/build-ports-data.py <dir-with-airports.csv-runways.csv-ports.json> > vtg-ports-data.js
"""
import csv, json, sys, os, re

src = sys.argv[1]
AF = {  # ISO2 -> display name (African states; non-sovereign territories like the Canary Islands are left out)
 'DZ':'Algeria','AO':'Angola','BJ':'Benin','BW':'Botswana','BF':'Burkina Faso','BI':'Burundi','CV':'Cabo Verde','CM':'Cameroon',
 'CF':'Central African Republic','TD':'Chad','KM':'Comoros','CG':'Republic of the Congo','CD':'DR Congo','CI':"Côte d'Ivoire",
 'DJ':'Djibouti','EG':'Egypt','GQ':'Equatorial Guinea','ER':'Eritrea','SZ':'Eswatini','ET':'Ethiopia','GA':'Gabon','GM':'Gambia',
 'GH':'Ghana','GN':'Guinea','GW':'Guinea-Bissau','KE':'Kenya','LS':'Lesotho','LR':'Liberia','LY':'Libya','MG':'Madagascar',
 'MW':'Malawi','ML':'Mali','MR':'Mauritania','MU':'Mauritius','MA':'Morocco','MZ':'Mozambique','NA':'Namibia','NE':'Niger',
 'NG':'Nigeria','RW':'Rwanda','ST':'São Tomé and Príncipe','SN':'Senegal','SC':'Seychelles','SL':'Sierra Leone','SO':'Somalia',
 'ZA':'South Africa','SS':'South Sudan','SD':'Sudan','TZ':'Tanzania','TG':'Togo','TN':'Tunisia','UG':'Uganda','ZM':'Zambia',
 'ZW':'Zimbabwe','EH':'Western Sahara','CN':'China','KR':'South Korea'}
# World Port Index country spellings -> display names
WPI = {'Algeria':'Algeria','Angola':'Angola','Benin':'Benin','Cabo Verde':'Cabo Verde','Cape Verde Is.':'Cabo Verde','Cameroon':'Cameroon',
 'Comoros':'Comoros','Comoros Is.':'Comoros','Congo':'Republic of the Congo','Republic of the Congo':'Republic of the Congo',
 'Congo, D.R.':'DR Congo','Democratic Republic of the Congo':'DR Congo',"Côte d'Ivoire":"Côte d'Ivoire",'Ivory Coast':"Côte d'Ivoire",
 'Djibouti':'Djibouti','Egypt':'Egypt','Equatorial Guinea':'Equatorial Guinea','Eritrea':'Eritrea','Gabon':'Gabon','Gambia':'Gambia',
 'Ghana':'Ghana','Guinea':'Guinea','Guinea-Bissau':'Guinea-Bissau','Kenya':'Kenya','Liberia':'Liberia','Libya':'Libya',
 'Madagascar':'Madagascar','Mauritania':'Mauritania','Mauritius':'Mauritius','Morocco':'Morocco','Mozambique':'Mozambique',
 'Namibia':'Namibia','Nigeria':'Nigeria','Senegal':'Senegal','Seychelles':'Seychelles','Sierra Leone':'Sierra Leone','Somalia':'Somalia',
 'South Africa':'South Africa','Sudan':'Sudan','São Tomé and Príncipe':'São Tomé and Príncipe','Tanzania':'Tanzania','Togo':'Togo',
 'Tunisia':'Tunisia','Western Sahara':'Western Sahara','China':'China','South Korea':'South Korea'}
REGION = lambda name: 'China' if name == 'China' else 'South Korea' if name == 'South Korea' else 'Africa'

def title_case(s):
    s = s or ''
    s = s.strip()
    if s.isupper():
        s = ' '.join(w.capitalize() if len(w) > 2 or w.lower() not in ('of', 'de', 'la', 'el', 'al') else w.lower() for w in s.split(' '))
    return s

out, seen_ids = [], set()
# ---- airports
longest = {}
for r in csv.DictReader(open(os.path.join(src, 'runways.csv'), encoding='utf-8')):
    try: ln = int(float(r['length_ft'])) if r['length_ft'] else 0
    except ValueError: ln = 0
    if r['closed'] == '1': continue
    cur = longest.get(r['airport_ident'])
    if not cur or ln > cur[0]: longest[r['airport_ident']] = (ln, r['surface'])
for r in csv.DictReader(open(os.path.join(src, 'airports.csv'), encoding='utf-8')):
    if r['iso_country'] not in AF or r['scheduled_service'] != 'yes' or not r['iata_code'] or r['type'] not in ('large_airport', 'medium_airport', 'small_airport'):
        continue
    country = AF[r['iso_country']]
    wiki = ''
    m = re.search(r'/wiki/([^?#]+)', r['wikipedia_link'] or '')
    if m: wiki = m.group(1).replace('_', ' ')
    rec = {'id': 'a-' + r['ident'], 't': 'A', 'n': r['name'], 'c': country, 'r': REGION(country), 'k': r['municipality'] or '',
           'lat': round(float(r['latitude_deg']), 4), 'lon': round(float(r['longitude_deg']), 4), 'code': r['iata_code'], 'ic': r['icao_code'] or r['ident'],
           'z': {'large_airport': 'Large', 'medium_airport': 'Medium', 'small_airport': 'Small'}[r['type']]}
    if wiki: rec['w'] = wiki
    if r['elevation_ft']:
        try: rec['el'] = int(float(r['elevation_ft']))
        except ValueError: pass
    if r['home_link'].startswith('http'): rec['u'] = r['home_link']
    lr = longest.get(r['ident'])
    if lr and lr[0]: rec['rw'] = lr[0]
    out.append(rec); seen_ids.add(rec['id'])
# ---- seaports (World Port Index)
data = json.load(open(os.path.join(src, 'ports.json'), encoding='utf-8'))
seen_sea = set()
for p in data['ports']:
    country = WPI.get(p['country'])
    if not country: continue
    # 1,780 entries are "location only" (no WPI name/id): use the nearest place name and a stable synthetic id
    name = title_case(p['wpi_port_name'] or p['point_of_interest'] or '')
    if not name: continue
    lat, lon = round(float(p['latitude']), 4), round(float(p['longitude']), 4)
    key = (name.lower(), country, round(lat, 1), round(lon, 1))
    if key in seen_sea: continue
    seen_sea.add(key)
    pid = ('s-%s' % p['wpi_port_id']) if p['wpi_port_id'] else 's-L%s%s' % (abs(int(lat * 100)), abs(int(lon * 100)))
    while pid in seen_ids: pid += 'x'
    seen_ids.add(pid)
    rec = {'id': pid, 't': 'S', 'n': name, 'c': country, 'r': REGION(country),
           'k': title_case(p['point_of_interest'] or p['state'] or ''), 'lat': lat, 'lon': lon,
           'code': ('WPI' + str(p['wpi_port_id'])) if p['wpi_port_id'] else ''}
    if p.get('max_vessel_size'): rec['mv'] = p['max_vessel_size']
    if p.get('mean_tidal_range_m') is not None: rec['td'] = p['mean_tidal_range_m']
    res = [k for k, f in (('tide', 'entrance_restriction_tide'), ('heavy swell', 'entrance_restriction_heavy_swell'), ('ice', 'entrance_restriction_ice'), ('other', 'entrance_restriction_other')) if p.get(f)]
    if res: rec['er'] = res
    out.append(rec)
out.sort(key=lambda x: (x['r'] != 'Africa', x['c'], x['t'], x['n']))
sys.stdout.write('/* VTG ports + airports of Africa, China and South Korea. GENERATED by scripts/build-ports-data.py - do not edit by hand.\n'
                 '   Airports: OurAirports (public domain). Seaports: NGA World Port Index, Pub. 150, 2019 edition (public domain). Facility details can be out of date. */\n'
                 'window.VTG_PORTS=' + json.dumps(out, ensure_ascii=False, separators=(',', ':')) + ';\n')
sys.stderr.write('airports=%d seaports=%d total=%d\n' % (sum(1 for x in out if x['t'] == 'A'), sum(1 for x in out if x['t'] == 'S'), len(out)))
