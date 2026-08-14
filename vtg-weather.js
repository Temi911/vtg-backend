(() => {
  const $ = s => document.querySelector(s);

  const HUBS = [
    { name: 'Lagos', lat: 6.5244, lon: 3.3792 },
    { name: 'Shanghai', lat: 31.2304, lon: 121.4737 },
    { name: 'Guangzhou', lat: 23.1291, lon: 113.2644 },
    { name: 'Dubai', lat: 25.2048, lon: 55.2708 }
  ];

  const CODES = {
    0: '☀ Clear', 1: '🌤 Mostly clear', 2: '⛅ Partly cloudy', 3: '☁ Overcast',
    45: '🌫 Fog', 48: '🌫 Fog', 51: '🌦 Light drizzle', 61: '🌧 Light rain',
    63: '🌧 Rain', 65: '🌧 Heavy rain', 71: '🌨 Snow', 80: '🌦 Showers',
    95: '⛈ Thunderstorm'
  };
  const desc = code => CODES[code] || '—';

  async function fetchHub(hub) {
    try {
      const r = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${hub.lat}&longitude=${hub.lon}&current=temperature_2m,weather_code`);
      const d = await r.json();
      return { ...hub, temp: Math.round(d.current.temperature_2m), code: d.current.weather_code };
    } catch { return { ...hub, temp: null, code: null } }
  }

  function buildPanel() {
    const drawer = $('#newsDrawer .drawerPanel');
    if (!drawer || $('#vtgWeatherPanel')) return;
    const style = document.createElement('style');
    style.textContent = `
    #vtgWeatherPanel{margin-top:16px;border:1px solid var(--line);border-radius:14px;background:#fff;padding:12px}
    #vtgWeatherPanel h4{margin:0 0 10px;font-size:10px;color:var(--navy);text-transform:uppercase;letter-spacing:.05em}
    .vtgWxGrid{display:grid;grid-template-columns:1fr 1fr;gap:8px}
    .vtgWxCard{border:1px solid var(--line);border-radius:10px;padding:9px;text-align:center}
    .vtgWxCard b{display:block;font-size:9px;color:var(--navy)}
    .vtgWxCard .t{font-size:15px;font-weight:800;color:var(--teal);margin:3px 0}
    .vtgWxCard small{font-size:8px;color:var(--muted)}
    `;
    document.head.appendChild(style);
    const panel = document.createElement('div');
    panel.id = 'vtgWeatherPanel';
    panel.innerHTML = `<h4>Trade hub weather — shipping conditions</h4><div class="vtgWxGrid" id="vtgWxGrid">${HUBS.map(h => `
      <div class="vtgWxCard"><b>${h.name}</b><div class="t">—</div><small>Loading…</small></div>`).join('')}</div>`;
    // Insert after the rates grid if present, else at the end of the panel.
    const rates = drawer.querySelector('.rates');
    if (rates) rates.after(panel); else drawer.appendChild(panel);
  }

  async function run() {
    buildPanel();
    const grid = $('#vtgWxGrid'); if (!grid) return;
    const results = await Promise.all(HUBS.map(fetchHub));
    grid.innerHTML = results.map(h => `
      <div class="vtgWxCard"><b>${h.name}</b><div class="t">${h.temp != null ? h.temp + '°C' : '—'}</div><small>${h.temp != null ? desc(h.code) : 'Unavailable'}</small></div>
    `).join('');
  }

  let started = false;
  function watch() {
    ['#newsBtn', '#newsOpen', '#heroNews', '#footNews'].forEach(sel => {
      const el = $(sel);
      if (el) el.addEventListener('click', () => { if (started) return; started = true; run(); setInterval(run, 600000) });
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', watch);
  else watch();
})();
