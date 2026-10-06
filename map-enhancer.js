(() => {
  /*
   * VTG Trade Atlas — premium rebuild
   * Replaces the previous Atlas presentation while keeping its launcher/API contract.
   * Location data comes from /api/atlas/locations.
   */
  const MAPLIBRE = 'https://unpkg.com/maplibre-gl@5.13.0/dist/maplibre-gl.js';
  const DAY_STYLE = 'https://tiles.openfreemap.org/styles/liberty';
  const NIGHT_STYLE = 'https://tiles.openfreemap.org/styles/dark';
  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const qs = (doc, s) => doc.querySelector(s);
  const qsa = (doc, s) => Array.from(doc.querySelectorAll(s));

  function imageSearchUrl(name, city, country, type) {
    const subject = type === 'airport' ? 'airport' : 'port';
    const q = encodeURIComponent((name + ' ' + city + ' ' + country + ' ' + subject).trim());
    return 'https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=' +
      q + '&gsrnamespace=6&gsrlimit=10&prop=imageinfo&iiprop=url|extmetadata&iiurlwidth=1000&format=json&origin=*';
  }

  async function getLocationImage(location) {
    try {
      const r = await fetch(imageSearchUrl(location.name, location.city, location.country, location.type), { headers: { Accept: 'application/json' } });
      const d = await r.json();
      const pages = Object.values(d?.query?.pages || {});
      const subject = location.type === 'airport' ? 'airport' : 'port';
      const terms = [String(location.name||''), String(location.city||''), String(location.country||''), subject]
        .map(v=>v.toLowerCase()).filter(Boolean);
      const scored = pages.map(p => {
        const title = String(p?.title||'').toLowerCase();
        const score = terms.reduce((n,t)=>n+(title.includes(t)?1:0),0);
        return {p,score};
      }).sort((a,b)=>b.score-a.score);
      const usable = scored.find(x => x.score >= 2 && x.p.imageinfo?.[0]?.thumburl)
        || scored.find(x => x.p.imageinfo?.[0]?.thumburl)
        || scored.find(x => x.p.imageinfo?.[0]?.url);
      return usable?.p?.imageinfo?.[0]?.thumburl || usable?.p?.imageinfo?.[0]?.url || '';
    } catch (_) { return ''; }
  }

  async function getTradeImage(query) {
    try {
      const q = encodeURIComponent(String(query || '').trim());
      if (!q) return '';
      const url = 'https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=' +
        q + '&gsrnamespace=6&gsrlimit=8&prop=imageinfo&iiprop=url|extmetadata&iiurlwidth=1200&format=json&origin=*';
      const r = await fetch(url, {headers:{Accept:'application/json'}});
      const d = await r.json();
      const pages = Object.values(d?.query?.pages || {});
      const usable = pages.find(p => p.imageinfo?.[0]?.thumburl && /.(jpe?g|png|webp)$/i.test(p.imageinfo[0].thumburl))
        || pages.find(p => p.imageinfo?.[0]?.thumburl)
        || pages.find(p => p.imageinfo?.[0]?.url);
      return usable?.imageinfo?.[0]?.thumburl || usable?.imageinfo?.[0]?.url || '';
    } catch (_) { return ''; }
  }

  function getAutoMode() {
    const hour = new Date().getHours();
    return hour >= 6 && hour < 18 ? 'day' : 'night';
  }

  function run(doc) {
    if (!doc || doc.getElementById('vtgAtlasPremiumStyle')) return;
    const drawer = doc.getElementById('mapDrawer');
    const autoMode = getAutoMode();

    if (!drawer) return;

    const style = doc.createElement('style');
    style.id = 'vtgAtlasPremiumStyle';
    style.textContent = `
      #mapDrawer{background:#05080c!important}
      #mapDrawer .drawerPanel{position:relative!important;width:100vw!important;max-width:none!important;height:100vh!important;max-height:none!important;padding:0!important;border-radius:0!important;background:#05080c!important;color:#f7f0df!important;overflow:hidden!important}
      #mapDrawer .atlasX{position:absolute;right:22px;top:18px;z-index:40;width:44px;height:44px;border:1px solid rgba(244,210,129,.32);border-radius:14px;background:rgba(7,10,15,.72);backdrop-filter:blur(18px);color:#f5d38b;font-size:24px;cursor:pointer;box-shadow:0 10px 35px rgba(0,0,0,.3)}
      #mapDrawer .atlasCanvas{position:absolute;inset:0}
      #mapDrawer #vtgPremiumMap{position:absolute;inset:0}
      #mapDrawer .mapWash{position:absolute;inset:0;pointer-events:none;background:radial-gradient(circle at 48% 48%,transparent 0,rgba(2,5,9,.08) 42%,rgba(2,5,9,.72) 100%);z-index:2}
      #mapDrawer .atlasTop{position:absolute;left:24px;right:82px;top:18px;z-index:20;display:flex;align-items:center;gap:14px;pointer-events:none}
      #mapDrawer .atlasBrand{pointer-events:auto;display:flex;align-items:center;gap:11px;padding:9px 13px;border:1px solid rgba(244,210,129,.22);border-radius:16px;background:rgba(5,9,14,.66);backdrop-filter:blur(18px);box-shadow:0 12px 40px rgba(0,0,0,.28)}
      #mapDrawer .atlasBrandMark{width:46px;height:32px;border-radius:8px;display:block;object-fit:contain;object-position:center;background:transparent}
      #mapDrawer .atlasBrand strong{font-size:12px;letter-spacing:.12em;text-transform:uppercase}
      #mapDrawer .atlasBrand small{display:block;color:#aeb8c1;font-size:8px;margin-top:2px}
      #mapDrawer .atlasSearch{pointer-events:auto;flex:1;max-width:540px;height:48px;display:flex;align-items:center;gap:8px;padding:0 14px;border:1px solid rgba(255,255,255,.15);border-radius:15px;background:rgba(5,9,14,.66);backdrop-filter:blur(18px);box-shadow:0 12px 40px rgba(0,0,0,.28)}
      #mapDrawer .atlasSearch input{flex:1;border:0;outline:0;background:transparent;color:#fff;font:600 11px Manrope,system-ui}
      #mapDrawer .atlasSearch input::placeholder{color:#8c9aa5}
      #mapDrawer .atlasSearch button{border:0;border-radius:10px;background:#d71920;color:#fff;padding:8px 11px;font-size:9px;font-weight:900;cursor:pointer}
      #mapDrawer .atlasChips{pointer-events:auto;display:flex;gap:7px;flex-wrap:wrap}
      #mapDrawer .atlasOpsSummary{position:absolute;left:24px;top:142px;z-index:17;pointer-events:auto;display:flex;gap:6px;flex-wrap:wrap;max-width:390px}
      #mapDrawer .atlasOpsLiveMeta{position:absolute;left:24px;top:188px;z-index:17;pointer-events:auto;margin:0;color:#9aa7b0;font-size:7px;font-weight:800;letter-spacing:.03em}
      #mapDrawer .atlasShipmentList{position:absolute;left:24px;top:207px;z-index:17;width:min(370px,calc(100vw - 48px));pointer-events:auto;display:grid;gap:6px;margin:0;max-height:230px;overflow:auto;padding-right:2px}
      #mapDrawer .atlasShipmentList::-webkit-scrollbar{width:4px}
      #mapDrawer .atlasShipmentList::-webkit-scrollbar-thumb{background:rgba(255,255,255,.16);border-radius:99px}
      #mapDrawer .atlasShipmentCard{width:100%;display:grid;grid-template-columns:34px 1fr auto;gap:9px;align-items:center;padding:8px;border:1px solid rgba(255,255,255,.11);border-radius:12px;background:rgba(5,9,14,.68);color:#e8edf0;text-align:left;cursor:pointer;backdrop-filter:blur(14px)}
      #mapDrawer .atlasShipmentCard:hover,#mapDrawer .atlasShipmentCard.selected{border-color:rgba(224,92,76,.65);background:rgba(215,25,32,.11)}
      #mapDrawer .atlasShipmentCardIcon{width:34px;height:34px;border-radius:10px;display:grid;place-items:center;background:rgba(215,25,32,.15);border:1px solid rgba(215,25,32,.28);font-size:15px}
      #mapDrawer .atlasShipmentCardMain{min-width:0}
      #mapDrawer .atlasShipmentCardMain b{display:block;font-size:9px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      #mapDrawer .atlasShipmentCardMain small{display:block;color:#8f9ca6;font-size:7px;margin-top:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      #mapDrawer .atlasShipmentCardMeta{display:grid;justify-items:end;gap:3px}
      #mapDrawer .atlasShipmentBadge{font-size:6px;font-weight:900;text-transform:uppercase;letter-spacing:.06em;padding:4px 6px;border-radius:999px;background:rgba(255,255,255,.07);color:#cbd5dc}
      #mapDrawer .atlasShipmentPct{font-size:7px;color:#d7b55e;font-weight:900}
      #mapDrawer .atlasShipmentListEmpty{padding:12px;border:1px dashed rgba(255,255,255,.12);border-radius:12px;color:#7f8c96;font-size:8px;text-align:center}

      #mapDrawer .atlasOpsPill{border:1px solid rgba(255,255,255,.13);background:rgba(5,9,14,.68);color:#dce4ea;border-radius:999px;padding:6px 9px;font-size:7px;font-weight:900;cursor:pointer;backdrop-filter:blur(14px)}
      #mapDrawer .atlasOpsPill strong{font-size:9px;margin-right:3px;color:#fff}
      #mapDrawer .atlasOpsPill.active{border-color:#e05c4c;background:rgba(215,25,32,.16);color:#fff}
      #mapDrawer .atlasRoleScope{margin-left:7px;padding:3px 7px;border:1px solid rgba(255,255,255,.12);border-radius:999px;color:#cbd5dc;font-size:7px;letter-spacing:.04em}
      #mapDrawer .atlasNextBox{margin:8px 0 12px;padding:10px 11px;border:1px solid rgba(240,198,107,.22);border-radius:12px;background:rgba(240,198,107,.06);display:grid;gap:3px}
      #mapDrawer .atlasFactGrid{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin:7px 0 11px}
      #mapDrawer .atlasFact{min-width:0;padding:8px;border:1px solid rgba(255,255,255,.09);border-radius:10px;background:rgba(255,255,255,.025)}
      #mapDrawer .atlasFact small{display:block;color:#7f8c96;font-size:6px;text-transform:uppercase;letter-spacing:.08em;margin-bottom:3px}
      #mapDrawer .atlasFact b{display:block;color:#e7edf0;font-size:7px;line-height:1.35;overflow:hidden;text-overflow:ellipsis}

      #mapDrawer .atlasNextBox b{font-size:7px;letter-spacing:.1em;color:#d7b55e}
      #mapDrawer .atlasNextBox span{font-size:11px;font-weight:900;color:#f3f6f7}
      #mapDrawer .atlasNextBox small{font-size:8px;color:#93a0aa}
      #mapDrawer .atlasStep{width:100%;border:0;text-align:left;background:transparent;color:inherit;display:flex;gap:10px;padding:7px 0;cursor:pointer}
      #mapDrawer .atlasStep:hover{background:rgba(255,255,255,.035);border-radius:9px}
      #mapDrawer .atlasFilterLabel{width:100%;font-size:7px;letter-spacing:.1em;text-transform:uppercase;color:#7f8c96;margin-top:3px}
      #mapDrawer .atlasChip.shipmentStatus{padding:6px 9px;font-size:7px}

      #mapDrawer .atlasChip.shipments{border-color:rgba(224,92,76,.45);color:#ffd5cf}
      #mapDrawer .atlasChip.shipments.active{background:rgba(224,92,76,.18);border-color:#e05c4c;color:#fff}
            #mapDrawer .atlasShipmentMarker[data-status="delivered"]{background:rgba(49,156,92,.9);box-shadow:0 0 0 5px rgba(49,156,92,.12),0 8px 25px rgba(0,0,0,.45)}
      #mapDrawer .atlasShipmentMarker[data-status="arrived"]{background:rgba(240,175,55,.92)}
      #mapDrawer .atlasShipmentMarker[data-status="attention"]{background:rgba(215,25,32,.98)}
      #mapDrawer .atlasMarkerLabel{position:absolute;left:50%;top:32px;transform:translateX(-50%);white-space:nowrap;max-width:150px;overflow:hidden;text-overflow:ellipsis;padding:3px 6px;border:1px solid rgba(255,255,255,.14);border-radius:999px;background:rgba(7,11,17,.82);color:#e5ebef;font:800 6px Manrope,system-ui;letter-spacing:.04em;backdrop-filter:blur(8px);pointer-events:none}
      #mapDrawer .atlasPortLabel{position:absolute;left:34px;top:50%;transform:translateY(-50%);white-space:nowrap;max-width:150px;overflow:hidden;text-overflow:ellipsis;padding:4px 7px;border:1px solid rgba(240,198,107,.22);border-radius:999px;background:rgba(7,11,17,.86);color:#f1d38a;font:800 6px Manrope,system-ui;letter-spacing:.04em;backdrop-filter:blur(8px);pointer-events:none}
      #mapDrawer .atlasPortPhoto{margin:8px 0 12px;border-radius:14px;overflow:hidden;border:1px solid rgba(255,255,255,.1);background:#10161d;min-height:150px}
      #mapDrawer .atlasPortPhoto img{width:100%;height:180px;display:block;object-fit:cover}
      #mapDrawer .atlasPortPhotoEmpty{min-height:150px;display:grid;place-items:center;padding:18px;color:#8d9aa4;font-size:9px;text-align:center}
      #mapDrawer .atlasOperationalPortMarker{position:relative;width:31px;height:31px;border:1px solid rgba(240,198,107,.5);border-radius:11px;background:rgba(20,18,12,.9);color:#f0c66b;display:grid;place-items:center;padding:0;cursor:pointer;box-shadow:0 0 0 4px rgba(240,198,107,.08),0 7px 22px rgba(0,0,0,.4)}
      #mapDrawer .atlasRoutePopup{min-width:170px;max-width:240px;padding:10px 12px;border:1px solid rgba(255,255,255,.16);border-radius:12px;background:rgba(13,17,23,.94);box-shadow:0 12px 30px rgba(0,0,0,.35);color:#eef3f6;backdrop-filter:blur(10px);font-family:Manrope,sans-serif;pointer-events:none}
      #mapDrawer .atlasRoutePopup strong{display:block;font-size:9px;letter-spacing:.12em;color:#f0c66b;margin-bottom:4px}
      #mapDrawer .atlasRoutePopup span{display:block;font-size:12px;font-weight:700}
      #mapDrawer .atlasRoutePopup small{display:block;margin-top:4px;font-size:10px;color:#b9c5ce}
      #mapDrawer .atlasNextOperationalMarker{position:relative;width:38px;height:38px;border:1px solid rgba(240,198,107,.82);border-radius:50%;background:rgba(34,27,9,.94);color:#f6cf72;display:grid;place-items:center;padding:0;cursor:pointer;box-shadow:0 0 0 0 rgba(240,198,107,.35),0 0 24px rgba(240,198,107,.28);animation:vtgAtlasNextPulse 2.2s ease-out infinite}
      #mapDrawer .atlasNextOperationalMarker .core{font-size:15px;line-height:1}
      #mapDrawer .atlasNextOperationalMarker .label{position:absolute;left:50%;top:-15px;transform:translateX(-50%);white-space:nowrap;padding:3px 6px;border-radius:999px;background:#f0c66b;color:#171006;font:900 6px Manrope,system-ui;letter-spacing:.08em}
      #mapDrawer .atlasDestinationMarker{position:relative;width:30px;height:30px;border:1px solid rgba(255,255,255,.65);border-radius:9px;background:rgba(7,11,17,.94);color:#fff;display:grid;place-items:center;padding:0;cursor:pointer;box-shadow:0 0 0 4px rgba(255,255,255,.07),0 8px 22px rgba(0,0,0,.4)}
      #mapDrawer .atlasDestinationMarker .core{font-size:13px}
      #mapDrawer .atlasDestinationMarker .label{position:absolute;left:50%;top:31px;transform:translateX(-50%);white-space:nowrap;color:#d9e0e5;font:800 6px Manrope,system-ui;letter-spacing:.06em;text-transform:uppercase}
      @keyframes vtgAtlasNextPulse{0%{box-shadow:0 0 0 0 rgba(240,198,107,.35),0 0 24px rgba(240,198,107,.28)}70%{box-shadow:0 0 0 13px rgba(240,198,107,0),0 0 30px rgba(240,198,107,.08)}100%{box-shadow:0 0 0 13px rgba(240,198,107,0),0 0 24px rgba(240,198,107,.02)}}
      #mapDrawer .atlasOperationalPortMarker.customs{border-color:rgba(215,25,32,.72);color:#ff8f95;box-shadow:0 0 0 4px rgba(215,25,32,.1),0 7px 22px rgba(0,0,0,.4)}
      #mapDrawer .atlasPortIcon{position:relative;z-index:2;font-size:14px}
      #mapDrawer .atlasPortHalo{position:absolute;inset:-4px;border:1px solid currentColor;border-radius:14px;opacity:.22;animation:vtgPortPulse 2.8s ease-out infinite}
      @keyframes vtgPortPulse{0%{transform:scale(.8);opacity:.4}80%{transform:scale(1.35);opacity:0}100%{opacity:0}}
      #mapDrawer .atlasLiveVesselPosition{position:relative;width:34px;height:34px;border:1px solid rgba(74,226,171,.65);border-radius:50%;background:rgba(4,25,22,.92);box-shadow:0 0 0 5px rgba(73,201,139,.1),0 0 24px rgba(73,201,139,.32);cursor:pointer;padding:0;z-index:8}
      #mapDrawer .atlasLiveVesselCore{position:absolute;left:50%;top:50%;width:8px;height:8px;transform:translate(-50%,-50%);border-radius:50%;background:#64e4ac;box-shadow:0 0 12px #49c98b}
      #mapDrawer .atlasLiveVesselRing{position:absolute;inset:4px;border:1px solid rgba(100,228,172,.6);border-radius:50%;animation:vtgAtlasLivePulse 1.8s ease-out infinite}
      #mapDrawer .atlasLiveVesselLabel{position:absolute;left:50%;top:-14px;transform:translateX(-50%);font:900 6px Manrope,system-ui;color:#65dfaa;letter-spacing:.08em}
      #mapDrawer .atlasLiveVesselPosition.stale{border-color:rgba(240,198,107,.65);box-shadow:0 0 0 5px rgba(240,198,107,.08),0 0 22px rgba(240,198,107,.2)}
      #mapDrawer .atlasLiveVesselPosition.stale .atlasLiveVesselCore{background:#f0c66b;box-shadow:0 0 12px #f0c66b}
      #mapDrawer .atlasLiveVesselPosition.stale .atlasLiveVesselLabel{color:#f0c66b}
      @keyframes vtgAtlasLivePulse{0%{transform:scale(.45);opacity:.9}70%{transform:scale(1.35);opacity:0}100%{transform:scale(1.35);opacity:0}}
      #mapDrawer .atlasShipmentMarker.live{width:42px;height:42px;border-color:rgba(91,220,188,.72);background:rgba(5,32,29,.94);box-shadow:0 0 0 6px rgba(73,201,139,.13),0 0 30px rgba(73,201,139,.28),0 10px 28px rgba(0,0,0,.5);z-index:4}
      #mapDrawer .atlasShipmentMarker.live .atlasShipmentIcon{font-size:17px}
      #mapDrawer .atlasShipmentMarker.live:after{content:"LIVE";position:absolute;left:50%;top:-15px;transform:translateX(-50%);padding:3px 5px;border-radius:999px;background:#49c98b;color:#04120d;font:900 6px Manrope,system-ui;letter-spacing:.08em}
      #mapDrawer .atlasShipmentMarker.live.stale{border-color:rgba(240,198,107,.7);background:rgba(42,32,8,.94);box-shadow:0 0 0 6px rgba(240,198,107,.1),0 0 26px rgba(240,198,107,.2),0 10px 28px rgba(0,0,0,.5)}
      #mapDrawer .atlasShipmentMarker.live.stale:after{content:"STALE";background:#f0c66b;color:#171006}
      #mapDrawer .atlasLiveFreshness{display:inline-flex;align-items:center;gap:5px;margin-left:5px;padding:3px 6px;border-radius:999px;font-size:7px;font-weight:900;text-transform:uppercase;letter-spacing:.06em;background:rgba(73,201,139,.12);color:#65dfaa;border:1px solid rgba(73,201,139,.28)}
      #mapDrawer .atlasLiveFreshness.stale{background:rgba(240,198,107,.1);color:#f0c66b;border-color:rgba(240,198,107,.25)}
      #mapDrawer .atlasShipmentMarker{position:relative;width:34px;height:34px;border:1px solid rgba(255,255,255,.24);border-radius:50%;background:rgba(215,25,32,.88);box-shadow:0 0 0 5px rgba(215,25,32,.10),0 8px 25px rgba(0,0,0,.45);display:grid;place-items:center;color:#fff;cursor:pointer;padding:0}
      #mapDrawer .atlasShipmentIcon{position:relative;z-index:2;font-size:16px;line-height:1}
      #mapDrawer .atlasShipmentPulse{position:absolute;inset:-5px;border:1px solid rgba(224,92,76,.55);border-radius:50%;animation:vtgAtlasPulse 2s ease-out infinite}
      @keyframes vtgAtlasPulse{0%{transform:scale(.72);opacity:.9}75%{transform:scale(1.35);opacity:0}100%{transform:scale(1.35);opacity:0}}
#mapDrawer .atlasChip{border:1px solid rgba(255,255,255,.15);background:rgba(5,9,14,.62);color:#dce4ea;border-radius:999px;padding:8px 11px;font-size:8px;font-weight:800;backdrop-filter:blur(14px);cursor:pointer}
      #mapDrawer .atlasChip.active{background:rgba(215,25,32,.18);border-color:rgba(215,25,32,.72);color:#ffb5b8}
      #mapDrawer .atlasLegend{position:absolute;left:24px;bottom:22px;z-index:15;display:flex;gap:8px;align-items:center;padding:9px 12px;border:1px solid rgba(255,255,255,.12);border-radius:14px;background:rgba(5,9,14,.68);backdrop-filter:blur(18px);font-size:8px;color:#aeb8c1}
      #mapDrawer .legendDot{width:8px;height:8px;border-radius:50%;display:inline-block;box-shadow:0 0 12px currentColor}
      #mapDrawer .legendDot.port{background:#f0c66b;color:#f0c66b}
      #mapDrawer .legendDot.air{background:#66d7df;color:#66d7df}
      #mapDrawer .legendDot.ship{background:#e05c4c;color:#e05c4c}
      #mapDrawer .legendDot.live{background:#fff;color:#fff}
      #mapDrawer .legendDot.next{background:#f0c66b;color:#f0c66b}
      #mapDrawer .legendDot.destination{background:#65c987;color:#65c987}
      #mapDrawer .atlasControls{position:absolute;right:22px;bottom:76px;z-index:15;display:grid;gap:7px}
      #mapDrawer .atlasControl{width:42px;height:42px;border:1px solid rgba(255,255,255,.14);border-radius:13px;background:rgba(5,9,14,.7);backdrop-filter:blur(16px);color:#e8edf0;font-weight:900;cursor:pointer}
      #mapDrawer .atlasControl:hover{border-color:#d71920;color:#ffb5b8}
      #mapDrawer .atlasMode{position:absolute;left:50%;bottom:22px;transform:translateX(-50%);z-index:15;display:flex;padding:4px;border:1px solid rgba(255,255,255,.13);border-radius:14px;background:rgba(5,9,14,.72);backdrop-filter:blur(18px)}
      #mapDrawer .atlasMode button{border:0;background:transparent;color:#8f9da7;padding:8px 11px;border-radius:10px;font-size:8px;font-weight:900;cursor:pointer}
      #mapDrawer .atlasMode button.active{background:rgba(215,25,32,.17);color:#ffb5b8}
      #mapDrawer .atlasInfo{position:absolute;right:24px;top:82px;z-index:30;width:min(410px,calc(100vw - 48px));max-height:calc(100vh - 124px);overflow:auto;border:1px solid rgba(244,210,129,.25);border-radius:24px;background:rgba(7,11,17,.86);backdrop-filter:blur(24px);box-shadow:0 25px 80px rgba(0,0,0,.48);transform:translateX(110%);opacity:0;transition:.38s cubic-bezier(.2,.8,.2,1)}
      #mapDrawer .atlasInfo.open{transform:translateX(0);opacity:1}
      #mapDrawer .atlasHero{height:190px;position:relative;overflow:hidden;border-radius:23px 23px 0 0;background:linear-gradient(135deg,#111c26,#05080c)}
      #mapDrawer .atlasHero img{width:100%;height:100%;object-fit:cover;display:block;opacity:.78}
      #mapDrawer .atlasHero:after{content:"";position:absolute;inset:0;background:linear-gradient(180deg,rgba(0,0,0,.02),rgba(4,7,11,.92))}
      #mapDrawer .atlasHeroText{position:absolute;left:18px;right:18px;bottom:16px;z-index:2}
      #mapDrawer .atlasType{display:inline-flex;align-items:center;gap:6px;border:1px solid rgba(215,25,32,.5);background:rgba(5,9,14,.58);color:#ffb5b8;border-radius:999px;padding:5px 8px;font-size:7px;font-weight:900;letter-spacing:.1em;text-transform:uppercase}
      #mapDrawer .atlasHero h2{margin:7px 0 2px;font-size:25px;line-height:1.05;color:#fff;letter-spacing:-.03em}
      #mapDrawer .atlasHero p{margin:0;color:#bdc8cf;font-size:9px}
      #mapDrawer .atlasInfoBody{padding:16px 18px 20px}
      #mapDrawer .atlasInfoClose{position:absolute;right:12px;top:12px;z-index:5;width:34px;height:34px;border:1px solid rgba(255,255,255,.18);border-radius:11px;background:rgba(0,0,0,.45);color:#fff;cursor:pointer}
      #mapDrawer .atlasStats{display:grid;grid-template-columns:1fr 1fr 1fr;gap:7px;margin-bottom:13px}
      #mapDrawer .atlasStat{padding:10px;border:1px solid rgba(255,255,255,.09);border-radius:13px;background:rgba(255,255,255,.035)}
      #mapDrawer .atlasStat small{display:block;color:#7f8e99;font-size:7px;text-transform:uppercase;letter-spacing:.08em}
      #mapDrawer .atlasStat b{display:block;margin-top:4px;color:#eef3f5;font-size:10px}
      #mapDrawer .atlasSectionTitle{font-size:8px;text-transform:uppercase;letter-spacing:.13em;color:#e05c63;font-weight:900;margin:14px 0 7px}
      #mapDrawer .atlasDescription{font-size:10px;line-height:1.6;color:#b7c3ca}
      #mapDrawer .atlasLiveBox{display:grid;gap:4px;padding:10px;border:1px solid rgba(215,25,32,.28);border-radius:12px;background:rgba(215,25,32,.07);margin-bottom:10px}
      #mapDrawer .atlasLiveBox b{font-size:8px;letter-spacing:.12em;color:#ff9a9f}
      #mapDrawer .atlasLiveBox span{font-size:11px;color:#eef3f5;font-weight:900}
      #mapDrawer .atlasLiveBox small{font-size:8px;color:#aebbc2;line-height:1.5}
      #mapDrawer .atlasLiveBox.stale{border-color:rgba(240,198,107,.3);background:rgba(240,198,107,.06)}
      #mapDrawer .atlasLiveBox.unavailable{border-color:rgba(255,255,255,.1);background:rgba(255,255,255,.025)}
      #mapDrawer .atlasLiveBox.unavailable b{color:#aebbc2}
      #mapDrawer .atlasUnifiedStep.stage-finance{border-left:3px solid #8aa7ff}
      #mapDrawer .atlasUnifiedStep.stage-logistics{border-left:3px solid #f0c66b}
      #mapDrawer .atlasUnifiedStep.stage-customs{border-left:3px solid #d71920}
      #mapDrawer .atlasUnifiedStep.stage-inspection{border-left:3px solid #9b7cff}
      #mapDrawer .atlasUnifiedStep.stage-delivery{border-left:3px solid #49c98b}
      #mapDrawer .atlasUnifiedTimeline{display:grid;gap:8px;margin:8px 0 16px}.atlasUnifiedStep{cursor:pointer;transition:transform .16s ease,border-color .16s ease,background .16s ease}.atlasUnifiedStep:hover{transform:translateX(2px);border-color:rgba(215,25,32,.48);background:rgba(215,25,32,.06)}.atlasUnifiedStep{display:grid;grid-template-columns:12px 1fr auto;gap:9px;align-items:center;padding:10px 11px;border:1px solid rgba(255,255,255,.08);border-radius:12px;background:rgba(255,255,255,.025)}.atlasUnifiedStep b{display:block;font-size:12px}.atlasUnifiedStep small{display:block;margin-top:3px;color:#aeb9c2;font-size:10px;line-height:1.35}.atlasUnifiedStep em{font-style:normal;text-transform:capitalize;font-size:9px;color:#9da9b2}.atlasUnifiedDot{width:8px;height:8px;border-radius:50%;background:#7d8790}.atlasUnifiedStep.done .atlasUnifiedDot{background:#49c98b}.atlasUnifiedStep.active .atlasUnifiedDot{background:#e3b341;box-shadow:0 0 0 4px rgba(227,179,65,.12)}.atlasUnifiedStep.attention .atlasUnifiedDot,.atlasUnifiedStep.disputed .atlasUnifiedDot{background:#e14b55}
.atlasTimeline{display:grid;gap:0;margin-top:6px}
      #mapDrawer .atlasStep{position:relative;display:grid;grid-template-columns:18px 1fr;gap:9px;padding:0 0 13px}
      #mapDrawer .atlasStep:not(:last-child):before{content:"";position:absolute;left:8px;top:16px;bottom:0;width:1px;background:rgba(255,255,255,.13)}
      #mapDrawer .atlasStepDot{width:17px;height:17px;border-radius:50%;border:1px solid rgba(255,255,255,.2);background:#10161c;z-index:2;box-shadow:0 0 0 3px rgba(255,255,255,.025)}
      #mapDrawer .atlasStep.done .atlasStepDot{background:#d71920;border-color:#d71920}
      #mapDrawer .atlasStep.active .atlasStepDot{background:#e05c4c;border-color:#ffb5b8;box-shadow:0 0 0 4px rgba(224,92,76,.14),0 0 16px rgba(224,92,76,.35)}
      #mapDrawer .atlasStep b{display:block;color:#eef3f5;font-size:9px}
      #mapDrawer .atlasStep small{display:block;color:#8997a1;font-size:7px;margin-top:3px;line-height:1.45}
      #mapDrawer .atlasStageNav{display:flex;gap:5px;overflow-x:auto;margin:0 0 12px;padding-bottom:2px;scrollbar-width:none}
      #mapDrawer .atlasStageNav::-webkit-scrollbar{display:none}
      #mapDrawer .atlasStageNav button{flex:0 0 auto;padding:6px 8px;border:1px solid rgba(255,255,255,.10);border-radius:9px;background:rgba(255,255,255,.035);color:#9eabb3;font-size:7px;font-weight:900;cursor:pointer}
      #mapDrawer .atlasStageNav button:hover{border-color:#d71920;color:#fff;background:rgba(215,25,32,.12)}
      #mapDrawer .atlasStageNav{align-items:center}
      #mapDrawer .atlasStageButton{display:inline-flex!important;align-items:center;gap:4px;min-width:74px;justify-content:center}
      #mapDrawer .atlasStageIcon{font-size:8px;line-height:1}
      #mapDrawer .atlasStageConnector{height:1px;flex:1 1 12px;min-width:8px;max-width:28px;background:rgba(255,255,255,.12)}
      #mapDrawer .atlasStageConnector.done{background:rgba(75,190,110,.5)}\n      #mapDrawer .atlasStageNav button.atlasStage-done{color:#9fe3b1;border-color:rgba(75,190,110,.32);background:rgba(75,190,110,.08)}\n      #mapDrawer .atlasStageNav button.atlasStage-active{color:#fff;border-color:rgba(215,25,32,.65);background:rgba(215,25,32,.16)}\n      #mapDrawer .atlasStageNav button.atlasStage-pending{color:#71808a}
      #mapDrawer .atlasJourneyStrip{display:grid;grid-template-columns:1fr auto 1fr auto 1fr;gap:6px;align-items:center;margin:0 0 13px;padding:10px;border:1px solid rgba(255,255,255,.10);border-radius:12px;background:rgba(255,255,255,.035)}
      #mapDrawer .atlasJourneyStrip>div{min-width:0}
      #mapDrawer .atlasJourneyStrip small{display:block;color:#788791;font-size:7px;font-weight:900;letter-spacing:.08em;margin-bottom:3px}
      #mapDrawer .atlasJourneyStrip b{display:block;color:#eef3f6;font-size:8px;line-height:1.35;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      #mapDrawer .atlasJourneyStrip>span{color:#d71920;font-size:13px;font-weight:900}
      #mapDrawer .atlasActions{display:grid;grid-template-columns:1fr 1fr;gap:7px;margin-top:15px}
      #mapDrawer .atlasAction{padding:10px;border-radius:11px;border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.04);color:#dfe7eb;font-size:8px;font-weight:900;cursor:pointer}
      #mapDrawer .atlasAction.primary{background:#d71920;border-color:#d71920;color:#fff}
      #mapDrawer .atlasImageCredit{margin-top:9px;color:#71808a;font-size:7px}
      #mapDrawer .atlasMarker{width:30px;height:30px;border-radius:50%;display:grid;place-items:center;border:1px solid rgba(255,255,255,.55);box-shadow:0 0 0 5px rgba(255,255,255,.04),0 0 24px currentColor;cursor:pointer;transform:translate(-50%,-50%);font-size:13px}
      #mapDrawer .atlasMarker.port{background:rgba(215,25,32,.94);color:#fff}
      #mapDrawer .atlasMarker.air{background:rgba(46,180,193,.92);color:#b8fbff}
      #mapDrawer .atlasMarker.selected{box-shadow:0 0 0 7px rgba(245,211,139,.15),0 0 34px currentColor;transform:translate(-50%,-50%) scale(1.18)}
      #mapDrawer .atlasMarker .pulse{position:absolute;inset:-7px;border:1px solid currentColor;border-radius:50%;opacity:.4;animation:vtgPulse 2.2s infinite}
      @keyframes vtgPulse{0%{transform:scale(.7);opacity:.6}75%,100%{transform:scale(1.5);opacity:0}}
      #mapDrawer .atlasCount{position:absolute;right:24px;top:82px;z-index:10;padding:7px 10px;border:1px solid rgba(255,255,255,.12);border-radius:999px;background:rgba(5,9,14,.65);color:#aeb8c1;font-size:7px;backdrop-filter:blur(15px)}
      #mapDrawer .atlasLoading{padding:35px;text-align:center;color:#9eabb4;font-size:9px}
      #mapDrawer .atlasLive{position:absolute;left:24px;top:86px;z-index:16;display:flex;gap:7px;align-items:center;padding:8px 11px;border:1px solid rgba(255,255,255,.12);border-radius:999px;background:rgba(5,9,14,.68);backdrop-filter:blur(18px);color:#b9c5ce;font-size:7px;font-weight:900;letter-spacing:.08em;text-transform:uppercase}
      #mapDrawer .atlasLive i{width:7px;height:7px;border-radius:50%;background:#e05c4c;box-shadow:0 0 12px #e05c4c;animation:vtgLive 1.6s infinite}
      #mapDrawer .atlasWeather{position:absolute;right:24px;bottom:22px;z-index:16;width:155px;padding:11px 12px;border:1px solid rgba(255,255,255,.12);border-radius:15px;background:rgba(5,9,14,.68);backdrop-filter:blur(18px);color:#dce4ea;font-size:8px;box-shadow:0 12px 40px rgba(0,0,0,.22)}
      #mapDrawer .atlasWeather b{display:block;font-size:10px;color:#fff;margin-bottom:3px}
      #mapDrawer .atlasWeather small{color:#8f9da7}
      @keyframes vtgLive{50%{opacity:.35;transform:scale(.75)}}
      #mapDrawer .atlasEmpty{padding:24px;color:#9eabb4;font-size:9px}
      #mapDrawer .atlasMedia{margin-top:14px}
      #mapDrawer .atlasMediaGrid{display:grid;grid-template-columns:1fr 1fr;gap:8px}
      #mapDrawer .atlasMediaCard{position:relative;min-height:116px;border:1px solid rgba(255,255,255,.10);border-radius:13px;overflow:hidden;background:#0c131a}
      #mapDrawer .atlasMediaCard img{width:100%;height:116px;object-fit:cover;display:block;opacity:.9}
      #mapDrawer .atlasMediaCard:after{content:"";position:absolute;inset:35% 0 0;background:linear-gradient(transparent,rgba(0,0,0,.88))}
      #mapDrawer .atlasMediaCard div{position:absolute;left:9px;right:9px;bottom:8px;z-index:2}
      #mapDrawer .atlasMediaCard b{display:block;color:#fff;font-size:8px}
      #mapDrawer .atlasMediaCard small{display:block;color:#c2cbd0;font-size:7px;margin-top:2px}
      #mapDrawer .atlasMediaStatus{color:#7f8e99;font-size:7px;margin-top:7px}
      @media(max-width:1000px){#mapDrawer .atlasTop{left:14px;right:70px;flex-wrap:wrap;align-items:flex-start}#mapDrawer .atlasSearch{flex:1 1 420px}#mapDrawer .atlasChips{display:flex;flex:1 1 100%;width:100%;flex-wrap:nowrap;overflow-x:auto;overflow-y:hidden;padding-bottom:2px;scrollbar-width:none}#mapDrawer .atlasChips::-webkit-scrollbar{display:none}#mapDrawer .atlasOpsSummary{left:14px;top:145px;max-width:calc(100vw - 28px)}#mapDrawer .atlasOpsLiveMeta{left:14px;top:191px}#mapDrawer .atlasShipmentList{left:14px;top:210px;width:min(390px,calc(100vw - 28px));max-height:170px}#mapDrawer .atlasInfo{right:14px;top:auto;bottom:72px;max-height:55vh;width:min(430px,calc(100vw - 28px))}#mapDrawer .atlasLegend{left:14px;bottom:78px;max-width:calc(100vw - 28px);overflow:auto;white-space:nowrap}#mapDrawer .atlasWeather{display:none}#mapDrawer .atlasMode{bottom:14px}}
      @media(max-width:620px){#mapDrawer .atlasBrand{display:none}#mapDrawer .atlasTop{right:58px}#mapDrawer .atlasSearch{max-width:none;flex-basis:100%}#mapDrawer .atlasSearch button{padding:8px}#mapDrawer .atlasOpsSummary{top:133px;max-width:calc(100vw - 28px)}#mapDrawer .atlasOpsLiveMeta{top:177px}#mapDrawer .atlasShipmentList{top:196px;max-height:132px}#mapDrawer .atlasInfo{bottom:72px;max-height:57vh}.atlasHero{height:150px!important}#mapDrawer .atlasStats{grid-template-columns:1fr 1fr}#mapDrawer .atlasMode{left:14px;right:14px;transform:none;justify-content:center}#mapDrawer .atlasMode button{padding:8px 7px}}
    `;
    doc.head.appendChild(style);

    drawer.innerHTML = `
      <div class="drawerPanel">
        <button class="atlasX" id="vtgAtlasClose" aria-label="Close Trade Atlas">×</button>
        <div class="atlasCanvas">
          <div id="vtgPremiumMap"></div>
          <div class="mapWash"></div>
          <div class="atlasTop">
            <div class="atlasBrand"><img class="atlasBrandMark" src="/assets/vtg-logo.svg" alt="Vintage Trade Global"><div><strong>VTG Trade Atlas</strong><small>Global trade intelligence • Africa · China · South Korea</small></div></div>
            <div class="atlasSearch"><span style="color:#d5a74f">⌕</span><input id="vtgAtlasSearch" placeholder="Search a port, airport, city or country"><button id="vtgAtlasFind">SEARCH</button></div>
            <div class="atlasChips">
              <button class="atlasChip active" data-filter="all">All</button>
              <button class="atlasChip" data-filter="seaport">Seaports</button>
              <button class="atlasChip" data-filter="airport">Airports</button><button class="atlasChip shipments" id="atlasShipmentsToggle">Shipments</button>
              <button class="atlasChip" data-region="Africa">Africa</button>
              <button class="atlasChip" data-region="China">China</button>
              <button class="atlasChip" data-region="Korea">South Korea</button>
              <span class="atlasFilterLabel">Shipment status</span>
              <button class="atlasChip shipmentStatus active" data-shipment-status="all">All</button>
              <button class="atlasChip shipmentStatus" data-shipment-status="in_transit">In transit</button>
              <button class="atlasChip shipmentStatus" data-shipment-status="arrived">At port</button>
              <button class="atlasChip shipmentStatus" data-shipment-status="attention">Attention</button>
              <button class="atlasChip shipmentStatus" data-shipment-status="delivered">Delivered</button>
            </div>
          </div>
          <div class="atlasLive"><i></i> LIVE TRADE ATLAS <span id="atlasRoleScope" class="atlasRoleScope">Loading workspace…</span></div>
          <div class="atlasCount" id="vtgAtlasCount">Loading locations…</div>
          <div class="atlasOpsSummary" id="atlasOpsSummary" aria-label="Shipment operational summary"></div>
          <div class="atlasOpsLiveMeta" id="atlasOpsLiveMeta">Vessel tracking status</div>
          <div class="atlasShipmentList" id="atlasShipmentList" aria-label="Shipment operations"></div>
          <div class="atlasWeather"><b id="atlasWeatherTitle">Network status</b><small id="atlasWeatherText">Monitoring trade corridors, ports and shipment activity</small></div>
          <div class="atlasInfo" id="vtgAtlasInfo"></div>
          <div class="atlasLegend" aria-label="Trade Atlas map legend">
            <span class="legendDot port"></span> Seaport
            <span style="margin-left:7px" class="legendDot air"></span> Airport
            <span style="margin-left:7px" class="legendDot ship"></span> Shipment
            <span style="margin-left:7px" class="legendDot live"></span> Live vessel
            <span style="margin-left:7px" class="legendDot next"></span> Next
            <span style="margin-left:7px" class="legendDot destination"></span> Destination
          </div>
          <div class="atlasMode" aria-label="Atlas map view">
            <button class="active" data-mapmode="night">Night</button>
            <button data-mapmode="day">Day</button>
          </div>
          <div class="atlasControls">
            <button class="atlasControl" id="atlasPlus">+</button>
            <button class="atlasControl" id="atlasMinus">−</button>
            <button class="atlasControl" id="atlasReset">◎</button>
            <button class="atlasControl" id="atlasCompass">N</button>
          </div>
        </div>
      </div>`;

    const closeAtlas = () => { drawer.classList.remove('open'); doc.body.style.overflow=''; };
    qs(doc, '#vtgAtlasClose').onclick = closeAtlas;
    doc.addEventListener('keydown', e => {
      if (e.key === 'Escape' && drawer.classList.contains('open')) closeAtlas();
    });
    if (!doc.querySelector('script[data-vtg-atlas-maplibre]')) {
      const s = doc.createElement('script');
      s.src = MAPLIBRE; s.dataset.vtgAtlasMaplibre='1'; doc.head.appendChild(s);
      s.onload = () => init(doc);
    } else init(doc);
  }

  async function init(doc) {
    const ml = window.maplibregl;
    if (!ml) return setTimeout(() => init(doc), 120);
    const map = new ml.Map({
      container: doc.getElementById('vtgPremiumMap'),
      style: NIGHT_STYLE,
      center: [50, 13],
      zoom: 1.75,
      projection: { type: 'globe' },
      attributionControl: true,
      pitch: 12
    });
    map.addControl(new ml.NavigationControl({showCompass:false,showZoom:false}), 'bottom-right');
    const locations = [];
    const markers = [];
    const shipmentMarkers = [];
    let shipments = [];
    let shipmentRoutesVisible = false;
    let atlasRefreshInFlight = false;
    let selectedShipmentId = null;
    let filterType='all', filterRegion='all', shipmentStatusFilter='all', mapMode='night'
  // Atlas follows the user's local civil time by default: day 06:00–17:59, night 18:00–05:59.
  let atlasAutoTime=true;
  let atlasAutoTimer=null;
  function atlasLocalMode(){
    const hour=new Date().getHours();
    return hour>=6&&hour<18?'day':'night';
  };

    function addCorridorLayer() {
      if (map.getSource('vtg-atlas-corridors')) return;
      map.addSource('vtg-atlas-corridors',{type:'geojson',data:{type:'FeatureCollection',features:[
        {type:'Feature',properties:{name:'Africa–China'},geometry:{type:'LineString',coordinates:[[3.38,6.45],[18,7],[35,12],[51,22],[103.85,1.29],[113.26,23.13]]}},
        {type:'Feature',properties:{name:'Africa–South Korea'},geometry:{type:'LineString',coordinates:[[3.38,6.45],[28,8],[57,20],[90,30],[126.98,37.46]]}}
      ]}});
      map.addLayer({id:'vtg-atlas-corridor-glow',type:'line',source:'vtg-atlas-corridors',paint:{'line-color':'#d71920','line-width':5,'line-opacity':.12,'line-blur':2}});
      map.addLayer({id:'vtg-atlas-corridors',type:'line',source:'vtg-atlas-corridors',paint:{'line-color':'#e05c63','line-width':1.5,'line-opacity':.42,'line-dasharray':[3,2]}});
    }

    function clearSelectedShipmentPath() {
      if (map.getLayer('vtg-selected-shipment-route')) map.removeLayer('vtg-selected-shipment-route');
      if (map.getLayer('vtg-selected-shipment-glow')) map.removeLayer('vtg-selected-shipment-glow');
      if (map.getSource('vtg-selected-shipment-route')) map.removeSource('vtg-selected-shipment-route');
    }

    function renderSelectedShipmentPath(s) {
      clearSelectedShipmentPath();
      const route=(s?.routePoints||[]).filter(validPoint);
      if(route.length<2) return;
      const coordinates=route.map(p=>[Number(p.lng),Number(p.lat)]);
      map.addSource('vtg-selected-shipment-route',{type:'geojson',data:{type:'Feature',properties:{shipmentId:s.id},geometry:{type:'LineString',coordinates}}});
      map.addLayer({id:'vtg-selected-shipment-glow',type:'line',source:'vtg-selected-shipment-route',paint:{'line-color':'#ffffff','line-width':10,'line-opacity':.08,'line-blur':5}});
      map.addLayer({id:'vtg-selected-shipment-route',type:'line',source:'vtg-selected-shipment-route',paint:{'line-color':'#ffffff','line-width':4.2,'line-opacity':.72,'line-dasharray':[1,1]}});
    }

    function clearShipmentLayer() {
      shipmentMarkers.splice(0).forEach(m=>m.remove());
      clearSelectedShipmentPath();
      if (map.getLayer('vtg-shipment-route')) map.removeLayer('vtg-shipment-route');
      if (map.getLayer('vtg-shipment-route-glow')) map.removeLayer('vtg-shipment-route-glow');
      if (map.getLayer('vtg-shipment-completed')) map.removeLayer('vtg-shipment-completed');
      if (map.getLayer('vtg-shipment-current-glow')) map.removeLayer('vtg-shipment-current-glow');
      if (map.getLayer('vtg-shipment-current')) map.removeLayer('vtg-shipment-current');
      if (map.getLayer('vtg-shipment-remaining')) map.removeLayer('vtg-shipment-remaining');
      if (map.getSource('vtg-shipment-routes')) map.removeSource('vtg-shipment-routes');
      if (map.getSource('vtg-shipment-progress')) map.removeSource('vtg-shipment-progress');
    }

    function validPoint(p) {
      return p && Number.isFinite(Number(p.lng)) && Number.isFinite(Number(p.lat));
    }

    function nearestRouteIndex(points, target) {
      if(!Array.isArray(points)||!points.length||!validPoint(target)) return -1;
      let best=-1, bestDist=Infinity;
      points.forEach((p,i)=>{
        if(!validPoint(p)) return;
        const d=Math.pow(Number(p.lng)-Number(target.lng),2)+Math.pow(Number(p.lat)-Number(target.lat),2);
        if(d<bestDist){bestDist=d;best=i;}
      });
      return best;
    }

    function pushProgressFeature(features, shipmentId, stage, points, meta={}) {
      const coords=(points||[]).filter(validPoint).map(p=>[Number(p.lng),Number(p.lat)]);
      if(coords.length<2) return;
      features.push({type:'Feature',properties:{shipmentId,stage,pointName:meta.pointName||'',nextPort:meta.nextPort||'',status:meta.status||''},geometry:{type:'LineString',coordinates:coords}});
    }

    function renderShipmentProgress(visibleShipments) {
      const completed=[], current=[], remaining=[];
      visibleShipments.forEach(s=>{
        const route=(s.routePoints||[]).filter(validPoint);
        if(route.length<2) return;
        const live=shipmentPoint(s);
        const next=s.journey?.next;
        const destination=route[route.length-1];
        const currentPoint=validPoint(live)?live:route[Math.max(0,nearestRouteIndex(route, s.journey?.current)||0)];
        const nextPoint=validPoint(next)?next:route[Math.min(route.length-1,Math.max(1,nearestRouteIndex(route,next)))];
        if(!validPoint(currentPoint)) return;

        const nextIdx=nearestRouteIndex(route,nextPoint);
        const currentIdx=nearestRouteIndex(route,currentPoint);
        const endCurrent=nextIdx>=0&&nextIdx>currentIdx?nextIdx:Math.min(route.length-1,currentIdx+1);

        pushProgressFeature(completed,s.id,'completed',[route[0],...route.slice(1,Math.max(1,currentIdx+1)),currentPoint]);
        pushProgressFeature(current,s.id,'current',[currentPoint,nextPoint||destination],{pointName:next?.name||'',nextPort:s.liveTracking?.nextPort||next?.name||'',status:s.status||''});
        if(validPoint(nextPoint)&&nextIdx>=0&&nextIdx<route.length-1){
          pushProgressFeature(remaining,s.id,'remaining',[nextPoint,...route.slice(nextIdx+1)],{pointName:destination?.name||s.destinationPort||'Destination',status:s.status||''});
        } else if(validPoint(destination)&&destination!==currentPoint){
          pushProgressFeature(remaining,s.id,'remaining',[currentPoint,destination]);
        }
      });
      const features=[...completed,...current,...remaining];
      if(!features.length) return;
      map.addSource('vtg-shipment-progress',{type:'geojson',data:{type:'FeatureCollection',features}});
      map.addLayer({id:'vtg-shipment-remaining',type:'line',source:'vtg-shipment-progress',filter:['==',['get','stage'],'remaining'],paint:{'line-color':'#9aa6b0','line-width':1.6,'line-opacity':.28,'line-dasharray':[1.5,2.5]}});
      map.addLayer({id:'vtg-shipment-completed',type:'line',source:'vtg-shipment-progress',filter:['==',['get','stage'],'completed'],paint:{'line-color':'#b7c0c7','line-width':2,'line-opacity':.32,'line-dasharray':[1,2]}});
      map.addLayer({id:'vtg-shipment-current-glow',type:'line',source:'vtg-shipment-progress',filter:['==',['get','stage'],'current'],paint:{'line-color':'#f0c66b','line-width':8,'line-opacity':.16,'line-blur':4}});
      map.addLayer({id:'vtg-shipment-current',type:'line',source:'vtg-shipment-progress',filter:['==',['get','stage'],'current'],paint:{'line-color':'#f0c66b','line-width':3.4,'line-opacity':.98,'line-dasharray':[1,1]}});
    }

    let activeRoutePopupMarker=null;

    function showAtlasRoutePopup(s, kind, point) {
      if(!point||!Number.isFinite(Number(point.lng))||!Number.isFinite(Number(point.lat))) return;
      if(activeRoutePopupMarker){ try{activeRoutePopupMarker.remove();}catch(_){} activeRoutePopupMarker=null; }
      const popup=doc.createElement('div');
      popup.className='atlasRoutePopup';
      const title=kind==='next'?'NEXT OPERATIONAL POINT':kind==='destination'?'DESTINATION':'CURRENT VESSEL POSITION';
      const name=point.name || (kind==='destination'?s.destinationPort:(s.liveTracking?.nextPort||s.nextPort)) || 'Operational point';
      const status=s.status||'In transit';
      popup.innerHTML='<strong>'+title+'</strong><span>'+name+'</span><small>'+status+(s.liveTracking?.eta&&kind==='next'?' • ETA '+s.liveTracking.eta:'')+'</small>';
      const marker=new ml.Marker({element:popup,anchor:'bottom'}).setLngLat([Number(point.lng),Number(point.lat)]).addTo(map);
      activeRoutePopupMarker=marker;
      window.setTimeout(()=>{ if(activeRoutePopupMarker===marker){ try{marker.remove();}catch(_){} activeRoutePopupMarker=null; } },4200);
    }

    function addProgressPointMarkers(visibleShipments) {
      visibleShipments.forEach(s=>{
        const next=s.journey?.next;
        const destination=(s.routePoints||[]).filter(validPoint).at(-1);
        if(validPoint(next)){
          const el=doc.createElement('button');
          el.type='button'; el.className='atlasNextOperationalMarker'; el.title='Next operational point • '+(next.name||'Next point');
          el.setAttribute('aria-label','Open next operational point for '+(s.reference||'Shipment')+': '+(next.name||'Next point'));
          el.setAttribute('aria-haspopup','dialog');
          el.innerHTML='<span class="label" aria-hidden="true">NEXT</span><span class="core" aria-hidden="true">◆</span>';
          el.onclick=e=>{e.stopPropagation();focusShipmentStage(s,'logistics',next);showAtlasRoutePopup(s,'next',next);};
          el.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();e.stopPropagation();focusShipmentStage(s,'logistics',next);showAtlasRoutePopup(s,'next',next);}};
          shipmentMarkers.push(new ml.Marker({element:el,anchor:'center'}).setLngLat([Number(next.lng),Number(next.lat)]).addTo(map));
        }
        if(validPoint(destination)){
          const same=validPoint(next)&&Math.abs(Number(next.lng)-Number(destination.lng))<.0001&&Math.abs(Number(next.lat)-Number(destination.lat))<.0001;
          if(same) return;
          const el=doc.createElement('button');
          el.type='button'; el.className='atlasDestinationMarker'; el.title='Destination • '+(s.destinationPort||'Destination');
          el.setAttribute('aria-label','Open destination for '+(s.reference||'Shipment')+': '+(s.destinationPort||'Destination'));
          el.setAttribute('aria-haspopup','dialog');
          el.innerHTML='<span class="core" aria-hidden="true">⚓</span><span class="label" aria-hidden="true">Destination</span>';
          el.onclick=e=>{e.stopPropagation();focusShipmentStage(s,'delivery',destination);showAtlasRoutePopup(s,'destination',destination);};
          el.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();e.stopPropagation();focusShipmentStage(s,'delivery',destination);showAtlasRoutePopup(s,'destination',destination);}};
          shipmentMarkers.push(new ml.Marker({element:el,anchor:'center'}).setLngLat([Number(destination.lng),Number(destination.lat)]).addTo(map));
        }
      });
    }

    function liveTrackingState(live) {
      if (!live?.available || !live?.timestamp) return {state:'unavailable',ageMinutes:null,label:'Unavailable'};
      const ms=Date.now()-new Date(live.timestamp).getTime();
      const ageMinutes=Number.isFinite(ms) ? Math.max(0,Math.round(ms/60000)) : null;
      if(ageMinutes==null) return {state:'unavailable',ageMinutes:null,label:'Unavailable'};
      if(ageMinutes<=30) return {state:'live',ageMinutes,label:ageMinutes===0?'Live now':String(ageMinutes)+'m ago'};
      return {state:'stale',ageMinutes,label:ageMinutes<1440?String(ageMinutes)+'m ago':String(Math.round(ageMinutes/1440))+'d ago'};
    }

    function shipmentPoint(s) {
      const live=s.liveTracking;
      const livePoint=live?.available && Number.isFinite(Number(live.latitude)) && Number.isFinite(Number(live.longitude)) ? {lng:Number(live.longitude),lat:Number(live.latitude)} : null;
      const p=livePoint || s.journey?.current || (Array.isArray(s.routePoints)&&s.routePoints.length ? s.routePoints[s.routePoints.length-1] : null);
      return p && Number.isFinite(Number(p.lng)) && Number.isFinite(Number(p.lat)) ? p : null;
    }

    function addLiveVesselPositionMarker(s) {
      if (!s?.liveTracking?.available) return;
      const lat=Number(s.liveTracking.latitude), lng=Number(s.liveTracking.longitude);
      if(!Number.isFinite(lat)||!Number.isFinite(lng)) return;
      const freshness=liveTrackingState(s.liveTracking);
      const el=doc.createElement('button');
      el.type='button';
      el.className='atlasLiveVesselPosition '+(freshness.state==='stale'?'stale':'');
      el.title=(s.reference||'Shipment')+' • '+(freshness.label);
      el.setAttribute('aria-label','Open live position for '+(s.reference||'Shipment')+' • '+freshness.label);
      el.setAttribute('aria-haspopup','dialog');
      el.innerHTML='<span class="atlasLiveVesselCore"></span><span class="atlasLiveVesselRing"></span><span class="atlasLiveVesselLabel">'+(freshness.state==='stale'?'STALE':'LIVE')+'</span>';
      el.onclick=e=>{e.stopPropagation();selectShipment(s);showAtlasRoutePopup(s,'current',shipmentPoint(s));};
      el.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();e.stopPropagation();selectShipment(s);showAtlasRoutePopup(s,'current',shipmentPoint(s));}};
      const marker=new ml.Marker({element:el,anchor:'center'}).setLngLat([lng,lat]).addTo(map);
      shipmentMarkers.push(marker);
    }

    function renderShipmentRoutes() {
      clearShipmentLayer();
      if (!shipmentRoutesVisible || !shipments.length) return;
      const visibleShipments=shipments.filter(s=>{
        if(s.status==='cancelled') return false;
        if(shipmentStatusFilter==='all') return true;
        if(shipmentStatusFilter==='customs') return Boolean(s.customs?.status&&s.customs.status!=='not_started'&&!['cleared','released'].includes(s.customs.status));
        return s.status===shipmentStatusFilter;
      });
      const selectedVisible=selectedShipmentId
        ? visibleShipments.find(s=>String(s.id)===String(selectedShipmentId))
        : null;
      if(selectedShipmentId && !selectedVisible){
        selectedShipmentId=null;
        renderShipmentList();
      }
      const features=visibleShipments.filter(s=>(s.routePoints||[]).length>=2).map(s=>({
        type:'Feature',
        properties:{shipmentId:s.id,reference:s.reference||'Shipment'},
        geometry:{type:'LineString',coordinates:s.routePoints.map(p=>[Number(p.lng),Number(p.lat)])}
      }));
      if(features.length){
        map.addSource('vtg-shipment-routes',{type:'geojson',data:{type:'FeatureCollection',features}});
        map.addLayer({id:'vtg-shipment-route-glow',type:'line',source:'vtg-shipment-routes',paint:{'line-color':'#e05c4c','line-width':7,'line-opacity':.16,'line-blur':4}});
        map.addLayer({id:'vtg-shipment-route',type:'line',source:'vtg-shipment-routes',paint:{'line-color':'#e05c4c','line-width':2.6,'line-opacity':.9,'line-dasharray':[2,1.3]}});
      }
      renderShipmentProgress(visibleShipments);
      visibleShipments.forEach(s=>{
        const p=shipmentPoint(s);
        if(!p) return;
        const el=doc.createElement('button');
        const state=s.status||'pending';
        const liveState=liveTrackingState(s.liveTracking);
        const isLivePosition=Boolean(s.liveTracking?.available && Number.isFinite(Number(s.liveTracking.latitude)) && Number.isFinite(Number(s.liveTracking.longitude)));
        el.className='atlasShipmentMarker'+(isLivePosition?' live':'')+(isLivePosition&&liveState.state==='stale'?' stale':'');
        el.dataset.status=state;
        el.dataset.liveState=liveState.state;
        el.type='button';
        const markerLabel=(s.reference||'Shipment')+' • '+(isLivePosition ? 'Vessel '+liveState.label : shipmentLabel(s.status));
        el.title=markerLabel;
        el.setAttribute('aria-label','Open shipment '+markerLabel);
        el.setAttribute('aria-haspopup','dialog');
        const icon=state==='delivered'?'✓':state==='arrived'?'⚓':state==='attention'?'!':isLivePosition?'◉':'🚢';
        el.innerHTML='<span class="atlasShipmentPulse"></span><span class="atlasShipmentIcon">'+icon+'</span>';
        el.onclick=e=>{e.stopPropagation();selectShipment(s);};
        el.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();e.stopPropagation();selectShipment(s);}};
        shipmentMarkers.push(new ml.Marker({element:el,anchor:'center'}).setLngLat([Number(p.lng),Number(p.lat)]).addTo(map));
        addLiveVesselPositionMarker(s);
      });
      addProgressPointMarkers(visibleShipments);
      // Re-apply the selected route after rebuilding the Atlas route layers.
      // This keeps the focused shipment visible after refreshes and Night/Day style changes.
      if(selectedVisible) renderSelectedShipmentPath(selectedVisible);
    }

    function shipmentLabel(status) {
      const labels = {
        pending:'Order / shipment pending', shipped:'Shipment departed', in_transit:'In transit',
        arrived:'Arrived at destination', delivered:'Delivered', cancelled:'Cancelled', attention:'Attention required'
      };
      return labels[status] || String(status || 'pending').replace(/_/g,' ');
    }

    function shipmentMilestoneRows(s) {
      const events = Array.isArray(s.milestones) ? s.milestones : [];
      const rows = events.map(e => ({
        label: e.location || 'Shipment milestone',
        detail: e.detail || (e.status === 'done' ? 'Completed' : e.status === 'active' ? 'Current operational point' : 'Pending'),
        status: e.status || 'pending',
        time: e.eventTime ? new Date(e.eventTime).toLocaleString([], {dateStyle:'medium',timeStyle:'short'}) : ''
      }));
      if (s.customs?.status && s.customs.status !== 'not_started') {
        rows.push({
          label: 'Customs clearance',
          detail: 'Status: ' + String(s.customs.status).replace(/_/g,' '),
          status: ['cleared','released'].includes(s.customs.status) ? 'done' : 'active',
          time: s.customs.clearedAt ? new Date(s.customs.clearedAt).toLocaleString([], {dateStyle:'medium',timeStyle:'short'}) : ''
        });
      }
      const delivery=s.delivery||{};
      rows.push({
        label:'Final delivery',
        detail:delivery.status==='confirmed'?'Delivery confirmed'+(delivery.proofAttached?' • Proof attached':''):(delivery.status==='disputed'?'Delivery disputed':'Awaiting delivery confirmation'),
        status:delivery.status==='confirmed'||s.status==='delivered'?'done':delivery.status==='disputed'?'active':'pending',
        time:delivery.confirmedAt?new Date(delivery.confirmedAt).toLocaleString([], {dateStyle:'medium',timeStyle:'short'}):''
      });
      return rows;
    }

function atlasTimelinePoint(t,s){
      const direct=t?.coordinates;
      if(direct&&Number.isFinite(Number(direct.lng))&&Number.isFinite(Number(direct.lat))) return direct;
      const current=s.journey?.current, next=s.journey?.next;
      const origin=s.routePoints?.[0], destination=s.routePoints?.[s.routePoints.length-1];
      const stage=String(t?.stage||'').toLowerCase();
      if(stage==='customs'||stage==='delivery') return destination||current||next||origin;
      if(stage==='inspection') return origin||current||next||destination;
      if(stage==='finance') return origin||current||next||destination;
      return current||next||destination||origin;
    }

    function atlasStageProgress(s){
      const stages=['finance','logistics','customs','inspection','delivery'];
      const timeline=Array.isArray(s&&s.timeline)?s.timeline:[];
      const seen=timeline.map(t=>({stage:String(t&&t.stage||'logistics').toLowerCase(),status:String(t&&t.status||'pending').toLowerCase()}));
      const done=new Set(seen.filter(e=>['done','completed','confirmed'].includes(e.status)).map(e=>e.stage));
      const customs=String(s&&s.customs&&s.customs.status||'').toLowerCase();
      const delivery=String(s&&s.delivery&&s.delivery.status||'').toLowerCase();
      if(customs==='released'||customs==='cleared') done.add('customs');
      if(delivery==='confirmed'||String(s&&s.status||'').toLowerCase()==='delivered') done.add('delivery');
      const activeEvent=[...seen].reverse().find(e=>['active','in_progress'].includes(e.status));
      const active=activeEvent?activeEvent.stage:stages.find(stage=>!done.has(stage));
      return Object.fromEntries(stages.map(stage=>[stage,done.has(stage)?'done':stage===active?'active':'pending']));
    }

    function atlasStageRailMarkup(s){
      const states=atlasStageProgress(s);
      const stages=['finance','logistics','customs','inspection','delivery'];
      return stages.map((stage,i)=>{
        const state=states[stage];
        const icon=state==='done'?'✓':state==='active'?'●':'○';
        const button='<button type="button" class="atlasStageButton atlasStage-'+state+'" data-atlas-stage="'+stage+'" data-atlas-stage-state="'+state+'"><span class="atlasStageIcon">'+icon+'</span><span>'+stage[0].toUpperCase()+stage.slice(1)+'</span></button>';
        const connector=i<stages.length-1?'<span class="atlasStageConnector '+(state==='done'?'done':'')+'" aria-hidden="true"></span>':'';
        return button+connector;
      }).join('');
    }

    async function focusShipmentStage(s, stage, point){
      if(!s) return;
      await selectShipment(s);
      const p=point || atlasTimelinePoint({stage},s);
      if(p&&Number.isFinite(Number(p.lng))&&Number.isFinite(Number(p.lat))){
        map.flyTo({center:[Number(p.lng),Number(p.lat)],zoom:7,duration:900});
      }
      const panel=qs(doc,'#vtgAtlasInfo');
      const target=Array.from(panel.querySelectorAll('[data-atlas-unified-index]')).find(btn=>{
        const idx=Number(btn.dataset.atlasUnifiedIndex);
        const item=Array.isArray(s.timeline)?s.timeline[idx]:null;
        return String(item?.stage||'').toLowerCase()===String(stage||'').toLowerCase();
      });
      if(target){
        target.scrollIntoView({behavior:'smooth',block:'center'});
        target.classList.add('active');
        window.setTimeout(()=>target.classList.remove('active'),1400);
      }
    }

    async function selectShipment(s) {
      locationPanelRequest++;
      markers.forEach(m=>m.getElement().classList.remove('selected'));
      selectedShipmentId = s?.id || null;
      renderShipmentList();
      renderSelectedShipmentPath(s);
      const panel=qs(doc,'#vtgAtlasInfo');
      panel.classList.add('open');
      panel.innerHTML='<div class="atlasHero"><div class="atlasLoading">Loading shipment intelligence…</div><button class="atlasInfoClose" id="atlasInfoClose">×</button></div><div class="atlasInfoBody"><div class="atlasLoading">Loading shipment details…</div></div>';
      const p=s.journey?.current || s.routePoints?.[0];
      if(p) map.flyTo({center:[Number(p.lng),Number(p.lat)],zoom:5.2,duration:1000});
      const vessel=s.vessel||{};
      const customs=s.customs||{};
      const rows=shipmentMilestoneRows(s);
      const deliveryComplete=s.delivery?.status==='confirmed'||s.status==='delivered';
      const status=deliveryComplete?'Completed • Delivery confirmed':shipmentLabel(s.status);
      const origin=s.originPort||s.origin_port||'Origin port';
      const destination=s.destinationPort||s.destination_port||'Destination port';
      const vesselName=vessel.name||s.carrier||'Container vessel';
      panel.innerHTML=`
        <div class="atlasHero">
          <img id="atlasShipmentHeroImage" src="https://images.unsplash.com/photo-1606185540834-d6e7483ee1a4?q=85&w=1400&auto=format&fit=crop" alt="Real container ship used for VTG shipment context" style="width:100%;height:100%;object-fit:cover;display:block;opacity:.82"><div style="position:absolute;inset:0;background:linear-gradient(180deg,rgba(0,0,0,.05),rgba(4,7,11,.94))"></div>
          <div class="atlasHeroText"><span class="atlasType">${deliveryComplete?'✓ Completed shipment':'🚢 Shipment'} • ${esc(status)}</span><h2>${esc(s.reference||'Shipment')}</h2><p>${esc(s.originPort||'Origin')} → ${esc(s.destinationPort||'Destination')}</p></div>
          <button class="atlasInfoClose" id="atlasInfoClose">×</button>
        </div>
        <div class="atlasInfoBody">
          <div class="atlasCompletionBanner" style="${deliveryComplete?'':'display:none;'}"><b>✓ TRADE JOURNEY COMPLETED</b><span>Final destination reached • Proof of Delivery attached</span></div>
          <div class="atlasJourneyStrip">
            <div><small>CURRENT</small><b>${esc(s.journey?.current?.name || (s.liveTracking?.available ? "Vessel in transit" : origin))}</b></div>
            <span>→</span>
            <div><small>NEXT</small><b>${esc(s.journey?.next?.name || s.liveTracking?.nextPort || "Next operational point")}</b></div>
            <span>→</span>
            <div><small>DESTINATION</small><b>${esc(destination)}</b></div>
          </div>
          <div class="atlasStageNav" aria-label="Trade stages">${atlasStageRailMarkup(s)}</div>
          <div class="atlasLiveBox ${s.liveTracking?.available ? (liveTrackingState(s.liveTracking).state==='stale'?'stale':'') : 'unavailable'}"><b>VESSEL TRACKING <span class="atlasLiveFreshness">${esc(s.liveTracking?.available ? liveTrackingState(s.liveTracking).label : 'Unavailable')}</span></b><span>${s.liveTracking?.available ? esc(String(s.liveTracking.latitude ?? "—"))+', '+esc(String(s.liveTracking.longitude ?? "—")) : 'Live vessel position unavailable'}</span><small>${s.liveTracking?.available ? ((s.liveTracking.speedKnots != null ? esc(String(s.liveTracking.speedKnots))+" kn" : "Speed unavailable")+(s.liveTracking.course != null ? " • Course "+esc(String(s.liveTracking.course))+"°" : "")+(s.liveTracking.nextPort ? " • Next: "+esc(s.liveTracking.nextPort) : "")+(s.liveTracking.eta ? " • ETA: "+esc(new Date(s.liveTracking.eta).toLocaleString([], {dateStyle:"medium",timeStyle:"short"})) : "")) : 'The shipment map will continue using its latest operational position.'}</small></div>
          <div class="atlasStats">
            <div class="atlasStat"><small>Progress</small><b>${esc(String(s.percentComplete ?? 0))}%</b></div>
            <div class="atlasStat"><small>Vessel</small><b>${esc(vessel.name||'Not assigned')}</b></div>
            <div class="atlasStat"><small>Customs</small><b>${esc(String(customs.status||'not_started').replace(/_/g,' '))}</b></div>
          </div>
          <div class="atlasSectionTitle">Order → shipment → vessel → port → customs → buyer</div>
          <div class="atlasDescription">
            <b style="color:#eef3f5">${esc(s.reference||'Order')}</b> • Shipment ${esc(String(s.id).slice(0,8))}<br>
            ${vessel.name ? 'Vessel: '+esc(vessel.name)+(vessel.imo?' • IMO '+esc(vessel.imo):'')+'<br>' : ''}
            ${esc(s.originPort||'Origin not recorded')} → ${esc(s.destinationPort||'Destination not recorded')}
          </div>
          <div class="atlasSectionTitle">Unified trade timeline</div>
          ${s.timeline?.length ? '<div class="atlasUnifiedTimeline">'+s.timeline.map((t,i)=>'<button type="button" class="atlasUnifiedStep stage-'+esc(String(t.stage||'logistics').toLowerCase())+' '+esc(t.status||'pending')+'" data-atlas-unified-index="'+i+'"><span class="atlasUnifiedDot"></span><div><b>'+esc(t.label)+'</b><small>'+esc(t.detail||'')+(t.time?' • '+esc(new Date(t.time).toLocaleString([], {dateStyle:'medium',timeStyle:'short'})):'')+'</small></div><em>'+esc(String(t.stage||'').replace(/_/g,' '))+'</em></button>').join('')+'</div>' : '<div class="atlasDescription">No combined finance, logistics, customs, inspection or delivery milestones have been recorded yet.</div>'}
                    <div class="atlasSectionTitle">Operational timeline</div>
          ${s.liveTracking?.nextPort || s.journey?.next ? '<div class="atlasNextBox"><b>NEXT OPERATIONAL POINT</b><span>'+esc(s.liveTracking?.nextPort || s.journey?.next?.name || destination)+'</span><small>'+(s.liveTracking?.eta ? 'ETA '+esc(new Date(s.liveTracking.eta).toLocaleString([], {dateStyle:"medium",timeStyle:"short"})) : 'Next recorded milestone in the shipment journey')+'</small></div>' : ''}
          <div class="atlasTimeline">${rows.map((r,i)=>'<button type="button" class="atlasStep '+esc(r.status)+'" data-atlas-event-index="'+i+'"><span class="atlasStepDot"></span><div><b>'+esc(r.label)+'</b><small>'+esc(r.detail)+(r.time?' • '+esc(r.time):'')+'</small></div></button>').join('')}</div>
          <div class="atlasSectionTitle">Trade parties</div>
          <div class="atlasDescription">${s.buyerName?'Buyer: '+esc(s.buyerName)+'<br>':''}${s.supplierName?'Supplier: '+esc(s.supplierName):'Supplier details restricted by access role.'}</div>
          <div class="atlasSectionTitle">Next operational action</div>
          <div class="atlasDescription" id="atlasNextActionText"></div>
          <div class="atlasActions"><button class="atlasAction primary" id="atlasNextAction">Open next stage</button></div>
          <div class="atlasSectionTitle">Customs & clearance</div>
          <div class="atlasDescription">${esc(String(customs.status||'not_started').replace(/_/g,' '))}${customs.authority?' • '+esc(customs.authority):''}${customs.declarationRef?' • Declaration '+esc(customs.declarationRef):''}</div>
          <div class="atlasFactGrid">
            <div class="atlasFact"><small>Declaration</small><b>${esc(customs.declarationRef||'Not recorded')}</b></div>
            <div class="atlasFact"><small>Assessment</small><b>${customs.assessedAt?esc(new Date(customs.assessedAt).toLocaleString([], {dateStyle:'medium',timeStyle:'short'})):'Not assessed'}</b></div>
            <div class="atlasFact"><small>Cleared</small><b>${customs.clearedAt?esc(new Date(customs.clearedAt).toLocaleString([], {dateStyle:'medium',timeStyle:'short'})):'Pending'}</b></div>
            <div class="atlasFact"><small>Released</small><b>${customs.releasedAt?esc(new Date(customs.releasedAt).toLocaleString([], {dateStyle:'medium',timeStyle:'short'})):'Pending'}</b></div>
          </div>
          ${s.finance ? '<div class="atlasSectionTitle">Finance & trade settlement</div><div class="atlasDescription">'+
            '<b>Order value:</b> '+esc(String(s.finance.orderTotalUsd ?? '—'))+' '+esc(s.finance.orderCurrency||'USD')+
            (s.finance.incoterm?' • Incoterm: '+esc(s.finance.incoterm):'')+
            (s.finance.lc ? '<br><b>Letter of Credit:</b> '+esc(s.finance.lc.reference||'—')+' • '+esc(String(s.finance.lc.status||'requested').replace(/_/g,' '))+(s.finance.lc.amountUsd!=null?' • '+esc(String(s.finance.lc.amountUsd))+' USD':'')+(s.finance.lc.issuingBankName?' • '+esc(s.finance.lc.issuingBankName):'') : '<br><b>Letter of Credit:</b> Not recorded')+
            (s.finance.latestPayment ? '<br><b>Latest payment:</b> '+esc(String(s.finance.latestPayment.method||'payment').toUpperCase())+' • '+esc(String(s.finance.latestPayment.amount??'—'))+' '+esc(s.finance.latestPayment.currency||'')+' • '+esc(String(s.finance.latestPayment.status||'pending').replace(/_/g,' ')) : '<br><b>Latest payment:</b> None recorded')+
            '</div><div class="atlasFactGrid"><div class="atlasFact"><small>Active payments</small><b>'+esc(String(s.finance.activePaymentCount||0))+'</b></div><div class="atlasFact"><small>Completed payments</small><b>'+esc(String(s.finance.completedPaymentCount||0))+'</b></div><div class="atlasFact"><small>Settled amount</small><b>'+esc(String(s.finance.completedPaymentAmount??0))+' '+esc(s.finance.orderCurrency||'USD')+'</b></div><div class="atlasFact"><small>LC expiry</small><b>'+esc(s.finance.lc?.expiryDate||'Not recorded')+'</b></div></div>' : ''}
          ${s.inspection ? '<div class="atlasSectionTitle">Inspection / verification</div><div class="atlasDescription">'+
            '<b>'+esc(s.inspection.reference||'Inspection request')+'</b> • '+esc(s.inspection.productName||'Product verification')+' • '+esc(String(s.inspection.quantity??'—'))+
            (s.inspection.serviceLevel?' • '+esc(s.inspection.serviceLevel):'')+
            (s.inspection.urgent?' • URGENT':'')+'<br>Status: '+esc(String(s.inspection.status||'requested').replace(/_/g,' '))+
            ' • Payment: '+esc(String(s.inspection.paymentStatus||'unpaid'))+
            (s.inspection.assignedAgent?' • Agent assigned':' • Awaiting agent')+
            (s.inspection.evidenceCount?' • '+esc(String(s.inspection.evidenceCount))+' evidence file'+(s.inspection.evidenceCount===1?'':'s'):'')+
            (s.inspection.completedAt?' • Completed '+esc(new Date(s.inspection.completedAt).toLocaleString([], {dateStyle:"medium",timeStyle:"short"})):'')+
            '</div><div class="atlasFactGrid"><div class="atlasFact"><small>Checks</small><b>'+esc(s.inspection.requestedChecks||'Standard verification')+'</b></div><div class="atlasFact"><small>Report</small><b>'+esc(s.inspection.summary?'Available':'Pending')+'</b></div>'+(s.inspection.payoutStatus?'<div class="atlasFact"><small>Agent payout</small><b>'+esc(s.inspection.payoutStatus)+'</b></div>':'')+'</div>' : ''}
          <div class="atlasSectionTitle">Delivery & proof</div>
          <div class="atlasDescription"><b>${esc(String(delivery.status||'Awaiting confirmation').replace(/_/g,' '))}</b>${delivery.recipientName?' • Recipient: '+esc(delivery.recipientName):''}${delivery.notes?' • '+esc(delivery.notes):''}${delivery.proofAttached?' • Proof attached':''}</div>
          <div class="atlasFactGrid">
            <div class="atlasFact"><small>Proof</small><b>${delivery.proofAttached?'Attached':'Not attached'}</b></div>
            <div class="atlasFact"><small>Confirmed</small><b>${delivery.confirmedAt?esc(new Date(delivery.confirmedAt).toLocaleString([], {dateStyle:'medium',timeStyle:'short'})):'Pending'}</b></div>
          </div>
          <div class="atlasSectionTitle atlasMediaTitle">Trade media</div>
          <div class="atlasMedia"><div class="atlasMediaGrid">
            <article class="atlasMediaCard"><img id="atlasMediaOrigin" alt="${esc(origin)} port"><div><b>Origin</b><small>${esc(origin)}</small></div></article>
            <article class="atlasMediaCard"><img id="atlasMediaVessel" alt="${esc(vesselName)} vessel"><div><b>Vessel / cargo</b><small>${esc(vesselName)}</small></div></article>
            <article class="atlasMediaCard"><img id="atlasMediaDestination" alt="${esc(destination)} port"><div><b>Destination</b><small>${esc(destination)}</small></div></article>
            <article class="atlasMediaCard"><img id="atlasMediaRoute" alt="${esc(origin)} to ${esc(destination)} shipping corridor"><div><b>Trade corridor</b><small>${esc(origin)} ↔ ${esc(destination)}</small></div></article>
          </div><div class="atlasMediaStatus" id="atlasMediaStatus">Loading real trade imagery…</div></div>
          <div class="atlasActions"><button class="atlasAction primary" id="atlasRecordMilestone">Record milestone</button><button class="atlasAction" id="atlasRefreshShipment">Refresh shipment</button></div>
        </div>`;
      const mediaStatus=qs(doc,'#atlasMediaStatus');
      Promise.all([
        getTradeImage(origin + ' container port terminal'),
        getTradeImage(vesselName + ' container ship vessel'),
        getTradeImage(destination + ' container port terminal'),
        getTradeImage((origin + ' ' + destination + ' container shipping trade route').trim())
      ]).then(([a,b,c,d])=>{
        const urls=[['#atlasMediaOrigin',a],['#atlasMediaVessel',b],['#atlasMediaDestination',c],['#atlasMediaRoute',d]];
        let count=0;
        urls.forEach(([sel,url])=>{const el=panel.querySelector(sel);if(el&&url){el.src=url;el.onerror=()=>el.removeAttribute('src');count++;}});
        const hero=panel.querySelector('#atlasShipmentHeroImage');
        const placeholder=panel.querySelector('#atlasShipmentHeroPlaceholder');
        if(hero&&b){hero.src=b;hero.onload=()=>{hero.style.display='block';if(placeholder)placeholder.style.display='none';};hero.onerror=()=>{hero.removeAttribute('src');hero.style.display='none';if(placeholder)placeholder.style.display='grid';};}
        if(mediaStatus) mediaStatus.textContent=count?count+' real trade images loaded from public geographic/media sources.':'No public trade image matched this shipment yet; live shipment data remains available.';
      }).catch(()=>{if(mediaStatus)mediaStatus.textContent='Trade imagery is temporarily unavailable; live shipment data remains available.';});
      qsa(panel,'[data-atlas-stage]').forEach(btn=>btn.onclick=async()=>{
          const stage=String(btn.dataset.atlasStage||'logistics');
          await focusShipmentStage(s,stage,atlasTimelinePoint({stage},s));
        });
        qsa(panel,'[data-atlas-unified-index]').forEach(btn=>btn.onclick=async()=>{
        const idx=Number(btn.dataset.atlasUnifiedIndex);
        const t=Array.isArray(s.timeline)?s.timeline[idx]:null;
        const p=atlasTimelinePoint(t,s);
        await focusShipmentStage(s,t?.stage||'logistics',p);
      });
      qsa(panel,'[data-atlas-event-index]').forEach(btn=>btn.onclick=()=>{
        const idx=Number(btn.dataset.atlasEventIndex);
        const event=Array.isArray(s.milestones)?s.milestones[idx]:null;
        const p=event?.coordinates;
        if(p&&Number.isFinite(Number(p.lng))&&Number.isFinite(Number(p.lat))) map.flyTo({center:[Number(p.lng),Number(p.lat)],zoom:7,duration:900});
      });
      qs(doc,'#atlasInfoClose').onclick=()=>{panel.classList.remove('open');selectedShipmentId=null;clearSelectedShipmentPath();renderShipmentList();};
      const openShipmentBtn=qs(doc,'#atlasOpenShipment');
      if(openShipmentBtn) openShipmentBtn.onclick=()=>{ window.location.href='/trade-os.html?shipment='+encodeURIComponent(s.id); };
      const deliveryUpdateBtn=qs(doc,'#atlasDeliveryUpdate');
      if(deliveryUpdateBtn) deliveryUpdateBtn.onclick=async()=>{
        const current=String(s.delivery?.status||'pending');
        const status=window.prompt('Delivery status: pending, confirmed, or disputed',current);
        if(status===null)return;
        const normalized=String(status).trim().toLowerCase();
        if(!['pending','confirmed','disputed'].includes(normalized)){window.alert('Use pending, confirmed, or disputed.');return;}
        const proofFile=document.createElement('input'); proofFile.type='file'; proofFile.accept='.pdf,.jpg,.jpeg,.png,.webp'; proofFile.style.display='none'; document.body.appendChild(proofFile);
        const attachProof=window.confirm('Attach a proof-of-delivery document?'); let proofDocumentId;
        if(attachProof){ proofFile.click(); await new Promise(resolve=>{proofFile.onchange=resolve;}); const file=proofFile.files[0]; if(!file){proofFile.remove();return;}
          const fd=new FormData(); fd.append('file',file); fd.append('docType','proof_of_delivery'); fd.append('orderId',s.orderId);
          const token=localStorage.getItem('vtg_access_token'); const upload=await fetch('/api/documents',{method:'POST',headers:{Accept:'application/json',...(token?{Authorization:'Bearer '+token}:{})},body:fd}); const ud=await upload.json().catch(()=>({})); if(!upload.ok)throw new Error(ud.message||ud.error||'Proof document upload failed'); proofDocumentId=ud.document?.id;
        } proofFile.remove();
        const recipientName=window.prompt('Recipient name (optional):',s.delivery?.recipientName||'');
        if(recipientName===null)return;
        const notes=window.prompt('Delivery notes (optional):',s.delivery?.notes||'');
        if(notes===null)return;
        try{
          const resp=await fetch('/api/shipments/'+encodeURIComponent(s.id)+'/delivery',{method:'PATCH',headers:{'Content-Type':'application/json','Accept':'application/json',...(localStorage.getItem('vtg_access_token')?{Authorization:'Bearer '+localStorage.getItem('vtg_access_token')}:{})},body:JSON.stringify({status:normalized,recipientName:recipientName.trim()||undefined,notes:notes.trim()||undefined,proofDocumentId})});
          const data=await resp.json().catch(()=>({}));
          if(!resp.ok)throw new Error(data.message||data.error||'Unable to update delivery');
          await loadShipments();
          const fresh=shipments.find(x=>String(x.id)===String(s.id));
          if(fresh) await selectShipment(fresh);
        }catch(err){window.alert(err.message||'Unable to update delivery.');}
      };

      const openOrderBtn=qs(doc,'#atlasOpenOrder');
      if(openOrderBtn) openOrderBtn.onclick=()=>{ window.location.href='/trade-os.html?order='+encodeURIComponent(s.orderId); };
      qs(doc,'#atlasNextAction').onclick=()=>{
        const customsStatus=String(s.customs?.status||'not_started');
        const deliveryStatus=String(s.delivery?.status||'pending');
        let stage='logistics', label='Continue logistics';
        if(['documents_required','under_assessment','payment_due','inspection','on_hold'].includes(customsStatus)){stage='customs';label='Continue customs clearance';}
        else if(customsStatus==='cleared'){stage='customs';label='Prepare customs release';}
        else if(customsStatus==='released' && deliveryStatus!=='confirmed'){stage='delivery';label='Continue final delivery';}
        else if(deliveryStatus==='confirmed'){stage='delivery';label='Review completed delivery';}
        const textEl=qs(doc,'#atlasNextActionText'); if(textEl) textEl.textContent=label+' • '+String(stage).replace(/_/g,' ');
        window.location.href='/trade-os.html?shipment='+encodeURIComponent(s.id)+'&stage='+encodeURIComponent(stage);
      };
      {
        const customsStatus=String(s.customs?.status||'not_started');
        const deliveryStatus=String(s.delivery?.status||'pending');
        let stage='logistics', label='Continue logistics';
        if(['documents_required','under_assessment','payment_due','inspection','on_hold'].includes(customsStatus)){stage='customs';label='Continue customs clearance';}
        else if(customsStatus==='cleared'){stage='customs';label='Prepare customs release';}
        else if(customsStatus==='released' && deliveryStatus!=='confirmed'){stage='delivery';label='Continue final delivery';}
        else if(deliveryStatus==='confirmed'){stage='delivery';label='Review completed delivery';}
        const textEl=qs(doc,'#atlasNextActionText'); if(textEl) textEl.textContent=label+' • '+String(stage).replace(/_/g,' ');
      }

      qs(doc,'#atlasRefreshShipment').onclick=async()=>{ await loadShipments(); const fresh=shipments.find(x=>String(x.id)===String(s.id)); if(fresh) await selectShipment(fresh); };
      qs(doc,'#atlasRecordMilestone').onclick=async()=>{
        const location=window.prompt('Milestone location / operational point:', s.liveTracking?.nextPort || s.destinationPort || '');
        if(location===null)return;
        const detail=window.prompt('Milestone detail (optional):','');
        if(detail===null)return;
        const stage=window.prompt('Milestone stage: finance, logistics, customs, inspection, or delivery','logistics');
        if(!['finance','logistics','customs','inspection','delivery'].includes(String(stage||'').toLowerCase())){window.alert('Use finance, logistics, customs, inspection, or delivery.');return;}
        const status=window.prompt('Milestone status: active, done, or pending','active');
        if(!['active','done','pending'].includes(String(status||'').toLowerCase())){window.alert('Use active, done, or pending.');return;}
        const pctRaw=window.prompt('Shipment completion percentage (0–100):',String(s.percentComplete??0));
        const pct=Number(pctRaw);
        if(!Number.isInteger(pct)||pct<0||pct>100){window.alert('Completion percentage must be a whole number from 0 to 100.');return;}
        try{
          const resp=await fetch('/api/shipments/'+encodeURIComponent(s.id)+'/events',{method:'POST',headers:{'Content-Type':'application/json','Accept':'application/json',...(localStorage.getItem('vtg_access_token')?{Authorization:'Bearer '+localStorage.getItem('vtg_access_token')}:{})},body:JSON.stringify({location,detail,stage:String(stage).toLowerCase(),status:String(status).toLowerCase(),percentComplete:pct})});
          const data=await resp.json().catch(()=>({}));
          if(!resp.ok)throw new Error(data.message||data.error||'Unable to record milestone');
          await loadShipments();
          const fresh=shipments.find(x=>String(x.id)===String(s.id));
          if(fresh) await selectShipment(fresh);
        }catch(err){window.alert(err.message||'Unable to record milestone.');}
      };
    }

    function operationalCounts(){
      const active=shipments.filter(s=>s.status!=='cancelled');
      return {
        all:active.length,
        in_transit:active.filter(s=>s.status==='in_transit'||s.status==='shipped').length,
        arrived:active.filter(s=>s.status==='arrived').length,
        customs:active.filter(s=>{const x=s.customs?.status;return x&&x!=='not_started'&&!['cleared','released'].includes(x)}).length,
        attention:active.filter(s=>s.status==='attention'||s.status==='disputed').length,
        delivered:active.filter(s=>s.status==='delivered'||s.delivery?.status==='confirmed').length
      };
    }
    function filteredAtlasShipments(){
      const active=shipments.filter(s=>s.status!=='cancelled');
      if(shipmentStatusFilter==='all') return active;
      if(shipmentStatusFilter==='customs') return active.filter(s=>{
        const x=s.customs?.status;
        return x&&x!=='not_started'&&!['cleared','released'].includes(x);
      });
      if(shipmentStatusFilter==='attention') return active.filter(s=>s.status==='attention'||s.status==='disputed');
      if(shipmentStatusFilter==='delivered') return active.filter(s=>s.status==='delivered'||s.delivery?.status==='confirmed');
      if(shipmentStatusFilter==='in_transit') return active.filter(s=>s.status==='in_transit'||s.status==='shipped');
      return active.filter(s=>s.status===shipmentStatusFilter);
    }

    function renderShipmentList(){
      const box=qs(doc,'#atlasShipmentList');
      if(!box)return;
      const rows=filteredAtlasShipments().slice().sort((a,b)=>(Number(b.percentComplete||0)-Number(a.percentComplete||0))).slice(0,8);
      if(!rows.length){
        box.innerHTML='<div class="atlasShipmentListEmpty">No shipments match the current operational filter.</div>';
        return;
      }
      box.innerHTML=rows.map(s=>{
        const status=shipmentLabel(s.status);
        const current=s.journey?.current?.name||s.journey?.current||'Position unavailable';
        const next=s.liveTracking?.nextPort||s.journey?.next?.name||s.destinationPort||'Next point unavailable';
        const freshness=s.liveTracking?.available?liveTrackingState(s.liveTracking):null;
        const freshnessText=freshness?(freshness.state==='stale'?'Tracking stale':'Live position'):'No live position';
        const cardLabel=(s.reference||('Shipment '+String(s.id).slice(0,8)))+' • '+status+' • '+current+' to '+next+' • '+freshnessText+' • '+String(s.percentComplete??0)+'% complete';
        return '<button type="button" class="atlasShipmentCard '+(String(selectedShipmentId)===String(s.id)?'selected':'')+'" data-atlas-shipment-id="'+esc(s.id)+'" aria-label="Open '+esc(cardLabel)+'" aria-haspopup="dialog">'+
          '<span class="atlasShipmentCardIcon" aria-hidden="true">'+(s.status==='delivered'?'✓':s.status==='arrived'?'⚓':(s.status==='attention'||s.status==='disputed')?'!':'🚢')+'</span>'+
          '<span class="atlasShipmentCardMain"><b>'+esc(s.reference||('Shipment '+String(s.id).slice(0,8)))+'</b><small>'+esc((s.originPort||'Origin')+' → '+(s.destinationPort||'Destination'))+'</small><small>'+esc(current)+' → '+esc(next)+' • '+esc(freshnessText)+'</small></span>'+
          '<span class="atlasShipmentCardMeta"><span class="atlasShipmentBadge">'+esc(status)+'</span><span class="atlasShipmentPct">'+esc(String(s.percentComplete??0))+'%</span></span>'+
        '</button>';
      }).join('');
      qsa(box,'[data-atlas-shipment-id]').forEach(btn=>{
        const activate=()=>{
        const s=shipments.find(x=>String(x.id)===String(btn.dataset.atlasShipmentId));
        if(!s)return;
        shipmentRoutesVisible=true;
        qs(doc,'#atlasShipmentsToggle')?.classList.add('active');
        selectShipment(s);
        renderShipmentList();
        renderShipmentRoutes();
        };
        btn.onclick=activate;
        btn.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();activate();}};
      });
    }

    function renderOperationalSummary(){
      const box=qs(doc,'#atlasOpsSummary');
      if(!box)return;
      const n=operationalCounts();
      const pills=[
        ['all','ALL',n.all],['in_transit','IN TRANSIT',n.in_transit],['arrived','AT PORT',n.arrived],
        ['customs','CUSTOMS',n.customs],['attention','ATTENTION',n.attention],['delivered','DELIVERED',n.delivered]
      ];
      box.innerHTML=pills.map(([key,label,count])=>'<button type="button" class="atlasOpsPill '+(shipmentStatusFilter===key?'active':'')+'" data-op-status="'+key+'"><strong>'+count+'</strong>'+label+'</button>').join('');
      const liveCount=shipments.filter(s=>s.liveTracking?.available).length;
      const staleCount=shipments.filter(s=>s.liveTracking?.available&&liveTrackingState(s.liveTracking).state==='stale').length;
      const meta=qs(doc,'#atlasOpsLiveMeta');
      if(meta){
        const freshness=liveCount?(' • '+liveCount+' live vessel'+(liveCount===1?'':'s')+(staleCount?' • '+staleCount+' stale':'')):' • No live vessel positions available';
        meta.textContent=freshness.replace(/^ • /,'');
      }
      qsa(box,'[data-op-status]').forEach(btn=>btn.onclick=()=>{
        const key=btn.dataset.opStatus;
        shipmentStatusFilter=key==='customs'?'customs':key;
        shipmentRoutesVisible=true;
        qs(doc,'#atlasShipmentsToggle')?.classList.add('active');
        qsa(doc,'[data-shipment-status]').forEach(x=>x.classList.remove('active'));
        const statusBtn=qs(doc,'[data-shipment-status="'+(key==='all'?'all':key)+'"]');
        if(statusBtn)statusBtn.classList.add('active');
        renderOperationalSummary();
        renderShipmentList();
        renderShipmentRoutes();
        renderMarkers();
      });
    }

    function atlasRoleScope(){
      const path=String(location.pathname||'').toLowerCase();
      let role='';
      try{role=localStorage.getItem('vtg-last-role')||''}catch(_){}
      if(path.includes('admin-os')) role='admin';
      else if(path.includes('agent-dashboard')) role='agent';
      const labels={buyer:'Buyer • My shipments',supplier:'Supplier • Outbound shipments',bank:'Bank • Financed shipments',agent:'Agent • Assigned shipments',admin:'Admin • All shipments'};
      const el=qs(doc,'#atlasRoleScope');
      if(el) el.textContent=labels[role]||'Workspace • Authorized shipments';
    }

    async function loadShipments() {
      atlasRoleScope();
      if (atlasRefreshInFlight) return;
      atlasRefreshInFlight = true;
      try {
        const r=await fetch('/api/shipments/atlas',{headers:{Accept:'application/json'}});
        if(!r.ok){
          const el=qs(doc,'#atlasRoleScope');
          if(el) el.textContent=r.status===403?'No Atlas access for this workspace':'Shipment feed unavailable';
          return;
        }
        const d=await r.json();
        shipments=Array.isArray(d.shipments)?d.shipments:[];
        if(selectedShipmentId && !shipments.some(s=>String(s.id)===String(selectedShipmentId))){
          selectedShipmentId=null;
          clearSelectedShipmentPath();
        }
        renderOperationalSummary();
        renderShipmentList();
        const meta=qs(doc,'#atlasOpsLiveMeta');
        if(meta){
          const now=new Date();
          meta.textContent=meta.textContent.replace(/^.*?(?=\d+ live vessel)/,'') || (shipments.filter(s=>s.liveTracking?.available).length+' live vessels');
          meta.textContent += ' • updated '+now.toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'});
        }
        renderShipmentRoutes();
        const selected = selectedShipmentId && shipments.find(s=>String(s.id)===String(selectedShipmentId));
        if (selected && qs(doc,'#vtgAtlasInfo')?.classList.contains('open')) {
          const panel=qs(doc,'#vtgAtlasInfo');
          const live = selected.liveTracking?.available ? selected.liveTracking : null;
          const journeyStrip = panel.querySelector('.atlasJourneyStrip');
          if (journeyStrip) {
            const originName = selected.originPort||selected.origin_port||'Origin port';
            const destinationName = selected.destinationPort||selected.destination_port||'Destination port';
            const currentName = selected.journey?.current?.name || (selected.liveTracking?.available ? 'Vessel in transit' : originName);
            const nextName = selected.journey?.next?.name || selected.liveTracking?.nextPort || 'Next operational point';
            const cells = journeyStrip.querySelectorAll('b');
            if (cells.length >= 3) {
              cells[0].textContent = currentName;
              cells[1].textContent = nextName;
              cells[2].textContent = destinationName;
            }
          }
          const liveBox = panel.querySelector('.atlasLiveBox');
          if (liveBox && live) {
            const freshness=liveTrackingState(live);
            liveBox.innerHTML = '<b>LIVE VESSEL POSITION <span class="atlasLiveFreshness '+(freshness.state==='stale'?'stale':'')+'">'+esc(freshness.label)+'</span></b><span>'+esc(String(live.latitude ?? '—'))+', '+esc(String(live.longitude ?? '—'))+'</span><small>'+
              (live.speedKnots != null ? esc(String(live.speedKnots))+' kn' : 'Speed unavailable')+
              (live.course != null ? ' • Course '+esc(String(live.course))+'°' : '')+
              (live.nextPort ? ' • Next: '+esc(live.nextPort) : '')+
              (live.eta ? ' • ETA: '+esc(new Date(live.eta).toLocaleString([], {dateStyle:'medium',timeStyle:'short'})) : '')+
              '</small>';
          }
        }
      } catch (_) {
        const meta=qs(doc,'#atlasOpsLiveMeta');
        if(meta) meta.textContent='Shipment feed temporarily unavailable • retrying automatically';
      } finally {
        atlasRefreshInFlight = false;
      }
    }

    function clearMarkers() { markers.splice(0).forEach(m => m.remove()); }

    function visible() {
      const q = (qs(doc,'#vtgAtlasSearch')?.value || '').trim().toLowerCase();
      return locations.filter(x =>
        (filterType==='all'||x.type===filterType) &&
        (filterRegion==='all'||x.region===filterRegion) &&
        (!q || `${x.name} ${x.city} ${x.country} ${x.code}`.toLowerCase().includes(q))
      );
    }

    function markerFor(x) {
      const el=doc.createElement('button');
      el.className='atlasMarker '+(x.type==='airport'?'air':'port');
      el.type='button';
      const kind=x.type==='airport'?'Airport':'Seaport';
      const locationLabel=x.name+' • '+x.city+', '+x.country+(x.code?' • '+x.code:'');
      el.title=locationLabel;
      el.setAttribute('aria-label','Open '+kind+' details for '+locationLabel);
      el.setAttribute('aria-haspopup','dialog');
      el.innerHTML='<span class="atlasMarkerIcon" aria-hidden="true">'+(x.type==='airport'?'✈':'⚓')+'</span><span class="pulse" aria-hidden="true"></span><span class="atlasMarkerLabel">'+esc(x.name)+(x.code?' · '+esc(x.code):'')+'</span>';
      el.onclick=e=>{e.stopPropagation(); selectLocation(x)};
      el.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();e.stopPropagation();selectLocation(x)}};
      return new ml.Marker({element:el,anchor:'center'}).setLngLat([x.lng,x.lat]).addTo(map);
    }

    function renderMarkers() {
      clearMarkers();
      const v=visible();
      v.forEach(x=>markers.push(markerFor(x)));
      const activeShipments=filteredAtlasShipments();
      qs(doc,'#vtgAtlasCount').textContent=v.length+' locations • '+(v.filter(x=>x.type==='seaport').length)+' seaports • '+(v.filter(x=>x.type==='airport').length)+' airports • '+activeShipments.length+' shipments';
      // Main location markers are the single source of truth for ports and airports; avoid stacking a second port marker over the same location.
    }

    let locationPanelRequest=0;

    async function selectLocation(x) {
      const requestId=++locationPanelRequest;
      selectedShipmentId=null;
      if(activeRoutePopupMarker){try{activeRoutePopupMarker.remove();}catch(_){} activeRoutePopupMarker=null;}
      clearSelectedShipmentPath();
      markers.forEach(m=>m.getElement().classList.remove('selected'));
      renderShipmentList();
      const found=markers.find(m=>Math.abs(m.getLngLat().lng-x.lng)<.0001&&Math.abs(m.getLngLat().lat-x.lat)<.0001);
      found?.getElement().classList.add('selected');
      map.flyTo({center:[x.lng,x.lat],zoom:7.2,duration:1200});
      const panel=qs(doc,'#vtgAtlasInfo');
      panel.classList.add('open');
      panel.innerHTML='<div class="atlasHero"><div class="atlasLoading">Loading location imagery…</div><button class="atlasInfoClose" id="atlasInfoClose">×</button></div><div class="atlasInfoBody"><div class="atlasLoading">Loading location intelligence…</div></div>';
      qs(doc,'#atlasInfoClose').onclick=()=>{locationPanelRequest++;panel.classList.remove('open');markers.forEach(m=>m.getElement().classList.remove('selected'));};

      const image=await getLocationImage(x);
      if (requestId!==locationPanelRequest) return;
      const description=x.type==='seaport'
        ? `${x.name} is a strategic maritime gateway serving ${x.city}, ${x.country}. VTG Atlas identifies it as a seaport for trade-route discovery, shipment planning and port-to-port logistics.`
        : `${x.name} is an international air gateway serving ${x.city}, ${x.country}. VTG Atlas identifies it as an airport for air-cargo planning, trade connectivity and time-sensitive movement.`;
      const regionLabel=x.region==='Korea'?'South Korea':x.region;
      panel.innerHTML=`
        <div class="atlasHero">
          ${image?'<img src="'+esc(image)+'" alt="'+esc(x.name)+'">':'<div style="height:100%;display:grid;place-items:center;color:#d5a74f;font-size:44px">'+(x.type==='airport'?'✈':'⚓')+'</div>'}
          <div class="atlasHeroText"><span class="atlasType">${x.type==='airport'?'✈ Airport':'⚓ Seaport'} • ${esc(regionLabel)}</span><h2>${esc(x.name)}</h2><p>${esc(x.city)}, ${esc(x.country)} • ${esc(x.code)}</p></div>
          <button class="atlasInfoClose" id="atlasInfoClose">×</button>
        </div>
        <div class="atlasInfoBody">
          <div class="atlasStats">
            <div class="atlasStat"><small>Country</small><b>${esc(x.country)}</b></div>
            <div class="atlasStat"><small>City</small><b>${esc(x.city)}</b></div>
            <div class="atlasStat"><small>Code</small><b>${esc(x.code)}</b></div>
          </div>
          <div class="atlasSectionTitle">Location intelligence</div>
          <div class="atlasDescription">${esc(description)}</div>
          <div class="atlasSectionTitle">Coordinates</div>
          <div class="atlasDescription">${Number(x.lat).toFixed(4)}° ${Number(x.lat)>=0?'N':'S'} • ${Math.abs(Number(x.lng)).toFixed(4)}° ${Number(x.lng)>=0?'E':'W'}</div>
          <div class="atlasSectionTitle">VTG trade context</div>
          <div class="atlasDescription">${x.region==='Africa'?'African trade gateway connecting regional markets with global suppliers and buyers.':x.region==='China'?'Chinese production and export gateway with direct relevance to Africa–Asia trade corridors.':'South Korean trade gateway supporting advanced manufacturing, maritime and air-cargo connectivity.'}</div>
          <div class="atlasSectionTitle">${x.type==='airport'?'Air-cargo activity':'Port activity'}</div>
          <div class="atlasDescription" id="atlasPortActivity">Loading related trade activity…</div>
          <div class="atlasSectionTitle">${x.type==='airport'?'Airport image':'Port image'}</div>
          <div class="atlasPortPhoto">${image?'<img src="'+esc(image)+'" alt="'+esc(x.name)+' port">':'<div class="atlasPortPhotoEmpty">No suitable public port image was returned.</div>'}</div>
          <div class="atlasActions"><button class="atlasAction primary" id="atlasRoute">Explore routes</button><button class="atlasAction" id="atlasZoom">Zoom location</button></div>
          <div class="atlasImageCredit">${image?'Location image supplied through Wikimedia Commons search.':'No suitable public location image was returned; VTG location data remains available.'}</div>
        </div>`;
      qs(doc,'#atlasInfoClose').onclick=()=>{locationPanelRequest++;panel.classList.remove('open');markers.forEach(m=>m.getElement().classList.remove('selected'));};
      qs(doc,'#atlasZoom').onclick=()=>map.flyTo({center:[x.lng,x.lat],zoom:11,duration:1000});
      qs(doc,'#atlasRoute').onclick=()=>showRoutes(x);
      const relatedAll=shipments.filter(s=>{
        const names=[s.originPort,s.origin_port,s.destinationPort,s.destination_port,s.liveTracking?.nextPort].filter(Boolean).map(v=>String(v).toLowerCase());
        const target=[x.name,x.code,x.city].filter(Boolean).map(v=>String(v).toLowerCase());
        return target.some(t=>names.some(n=>n===t||n.includes(t)||t.includes(n)));
      });
      const activityEl=qs(doc,'#atlasPortActivity');
      if(activityEl){
        activityEl.innerHTML=relatedAll.length
          ? relatedAll.slice(0,6).map(s=>'<div style="padding:7px 0;border-bottom:1px solid rgba(255,255,255,.08)"><b>'+esc(s.reference||('Shipment '+String(s.id).slice(0,8)))+'</b><br><small>'+esc(shipmentLabel(s.status))+' • '+esc(s.originPort||'Origin')+' → '+esc(s.destinationPort||'Destination')+'</small></div>').join('')
          : 'No shipment is currently linked to this port in the Atlas feed.';
      }
    }

    async function showRoutes(x) {
      const panel=qs(doc,'#vtgAtlasInfo');
      const body=panel.querySelector('.atlasInfoBody');
      if(!body) return;
      body.insertAdjacentHTML('beforeend','<div class="atlasSectionTitle">Connected VTG corridors</div><div id="atlasRoutesText" class="atlasDescription">Loading trade corridors…</div>');
      try {
        const r=await fetch('/api/atlas/corridors');
        const d=await r.json();
        const rows=(d.data||[]).filter(c=>(c.from+' '+c.to+' '+c.name).toLowerCase().includes(x.city.toLowerCase()) || (c.from+' '+c.to+' '+c.name).toLowerCase().includes(x.name.toLowerCase()));
        qs(doc,'#atlasRoutesText').innerHTML=rows.length?rows.slice(0,6).map(c=>'<div style="padding:8px 0;border-bottom:1px solid rgba(255,255,255,.08)"><b style="color:#eef3f5">'+esc(c.name)+'</b><br><small>'+esc(c.mode)+' • '+esc(c.from)+' → '+esc(c.to)+'</small></div>').join(''):'No named VTG corridor is currently registered for this location.';
      } catch (_) { qs(doc,'#atlasRoutesText').textContent='Route intelligence is temporarily unavailable.'; }
    }

    async function loadLocations() {
      try {
        const r=await fetch('/api/atlas/locations');
        const d=await r.json();
        locations.push(...(d.data||[]));
        renderMarkers();
      } catch (_) {
        qs(doc,'#vtgAtlasCount').textContent='Location database unavailable';
      }
    }

    qsa(doc,'.atlasChip').forEach(b=>b.onclick=()=>{
      if(b.dataset.shipmentStatus){
        qsa(doc,'.atlasChip[data-shipment-status]').forEach(x=>x.classList.remove('active'));
        b.classList.add('active');
        shipmentStatusFilter=b.dataset.shipmentStatus;
        shipmentRoutesVisible=true;
        qs(doc,'#atlasShipmentsToggle').classList.add('active');
        renderShipmentRoutes();
        renderMarkers();
        return;
      }
      qsa(doc,'.atlasChip').forEach(x=>{if(!x.dataset.shipmentStatus)x.classList.remove('active')});
      b.classList.add('active');
      if(b.dataset.filter) filterType=b.dataset.filter;
      if(b.dataset.region) {filterRegion=b.dataset.region; filterType='all';}
      if(b.dataset.filter==='all') filterRegion='all';
      if(b.dataset.filter || b.dataset.region){
        shipmentStatusFilter='all';
        shipmentRoutesVisible=false;
        qs(doc,'#atlasShipmentsToggle')?.classList.remove('active');
        qsa(doc,'[data-shipment-status]').forEach(x=>x.classList.toggle('active',x.dataset.shipmentStatus==='all'));
        renderShipmentRoutes();
      }
      renderMarkers();
    });
    qs(doc,'#atlasShipmentsToggle').onclick=()=>{
      shipmentRoutesVisible=!shipmentRoutesVisible;
      qs(doc,'#atlasShipmentsToggle').classList.toggle('active',shipmentRoutesVisible);
      renderShipmentRoutes();
    };
    qs(doc,'#vtgAtlasFind').onclick=()=>atlasSearch();
    qs(doc,'#vtgAtlasSearch').onkeydown=e=>{if(e.key==='Enter')atlasSearch()};

    function atlasSearch(){
      const q=(qs(doc,'#vtgAtlasSearch')?.value||'').trim().toLowerCase();
      if(!q){renderMarkers();return;}
      const shipment=shipments.find(s=>[
        s.id,s.reference,s.carrier,s.vessel?.name,s.vessel?.imo,s.vessel?.mmsi,
        s.originPort,s.destinationPort,s.buyerName,s.supplierName,s.status
      ].filter(Boolean).join(' ').toLowerCase().includes(q));
      if(shipment){
        shipmentRoutesVisible=true;
        qs(doc,'#atlasShipmentsToggle').classList.add('active');
        selectShipment(shipment);
        renderShipmentRoutes();
        return;
      }
      renderMarkers();
      const location=locations.find(x=>`${x.name} ${x.city} ${x.country} ${x.code}`.toLowerCase().includes(q));
      if(location) selectLocation(location);
    }
    qs(doc,'#atlasPlus').onclick=()=>map.zoomIn();
    qs(doc,'#atlasMinus').onclick=()=>map.zoomOut();
    qs(doc,'#atlasReset').onclick=()=>{
      filterType='all';
      filterRegion='all';
      shipmentStatusFilter='all';
      shipmentRoutesVisible=false;
      qsa(doc,'.atlasChip').forEach(x=>x.classList.remove('active'));
      qs(doc,'[data-filter="all"]')?.classList.add('active');
      qs(doc,'[data-shipment-status="all"]')?.classList.add('active');
      qs(doc,'#atlasShipmentsToggle')?.classList.remove('active');
      const search=qs(doc,'#vtgAtlasSearch'); if(search) search.value='';
      selectedShipmentId=null;
      clearSelectedShipmentPath();
      if(activeRoutePopupMarker){try{activeRoutePopupMarker.remove();}catch(_){} activeRoutePopupMarker=null;}
      renderMarkers();
      renderShipmentRoutes();
      locationPanelRequest++; qs(doc,'#vtgAtlasInfo')?.classList.remove('open');
      map.flyTo({center:[50,13],zoom:1.75,duration:900});
    };
    qs(doc,'#atlasCompass').onclick=()=>map.resetNorthPitch();

    function setMode(mode, automatic=false) {
      mapMode=mode;
      if(!automatic) atlasAutoTime=false;
      qsa(doc,'[data-mapmode]').forEach(b=>b.classList.toggle('active',b.dataset.mapmode===mode));
      const target=mode==='day'?DAY_STYLE:NIGHT_STYLE;
      map.setStyle(target);
      map.once('styledata',()=>{addCorridorLayer();renderShipmentRoutes();});
    }
    function applyLocalTimeMode(force=false){
      const mode=atlasLocalMode();
      if(force || atlasAutoTime || mapMode!==mode) setMode(mode,true);
    }
    qsa(doc,'[data-mapmode]').forEach(b=>b.onclick=()=>{
      atlasAutoTime=false;
      setMode(b.dataset.mapmode);
    });
    // Start from the user's actual local clock and automatically switch at the next 06:00/18:00 boundary.
    applyLocalTimeMode(true);
    if(atlasAutoTimer) clearInterval(atlasAutoTimer);
    atlasAutoTimer=window.setInterval(()=>{ if(atlasAutoTime) applyLocalTimeMode(false); },60000);
    window.addEventListener('focus',()=>{if(atlasAutoTime) applyLocalTimeMode(false);});
    document.addEventListener('visibilitychange',()=>{if(!document.hidden&&atlasAutoTime) applyLocalTimeMode(false);});

    loadLocations();
    loadShipments();
    // Keep Atlas operational state fresh without creating a tight polling loop.
    window.setInterval(loadShipments, 60000);
    const wt=qs(doc,'#atlasWeatherText');
    const wh=qs(doc,'#atlasWeatherTitle');
    if (wt && wh) {
      const hour=new Date().getUTCHours();
      wh.textContent=hour>=6&&hour<18?'Global trade network':'Trade network';
      wt.textContent='Africa ↔ China ↔ South Korea • ports, shipments and corridors';
    }
    const shipmentFromFeature=e=>{
      const id=e.features?.[0]?.properties?.shipmentId;
      return shipments.find(s=>String(s.id)===String(id));
    };
    ['vtg-shipment-route','vtg-selected-shipment-route','vtg-shipment-current','vtg-shipment-remaining','vtg-shipment-completed'].forEach(layer=>{
      map.on('click',layer,(e)=>{
        const shipment=shipmentFromFeature(e);
        if(shipment) focusShipmentStage(shipment,'logistics');
      });
      map.on('mouseenter',layer,()=>{map.getCanvas().style.cursor='pointer';});
      map.on('mouseleave',layer,()=>{map.getCanvas().style.cursor='';});
    });
    map.on('load',()=>{addCorridorLayer();renderShipmentRoutes();});
  }

  window.VTGInitMap = () => {
    const doc=document;
    if (doc.getElementById('vtgPremiumMap')) return;
    run(doc);
  };
  if (document.readyState==='loading') document.addEventListener('DOMContentLoaded',()=>window.VTGInitMap(),{once:true});
  else window.VTGInitMap();
})();