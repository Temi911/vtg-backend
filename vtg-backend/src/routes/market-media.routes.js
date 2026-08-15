const express = require('express');
const router = express.Router();
const crypto = require('crypto');

const generatedCache = new Map();
const MAX_CACHE = 24;
const isHttpUrl = value => /^https?:\/\//i.test(String(value || ''));
const clean = value => String(value || '').replace(/[<>\"']/g, '').trim();
const htmlAttr = (html, attr) => {
  const re = new RegExp(`<meta[^>]+(?:property|name)=[\\\"']${attr}[\\\"'][^>]+content=[\\\"']([^\\\"']+)[\\\"'][^>]*>`, 'i');
  const re2 = new RegExp(`<meta[^>]+content=[\\\"']([^\\\"']+)[\\\"'][^>]+(?:property|name)=[\\\"']${attr}[\\\"'][^>]*>`, 'i');
  return (html.match(re)?.[1] || html.match(re2)?.[1] || '').trim();
};

async function articleImage(articleUrl) {
  if (!isHttpUrl(articleUrl)) return null;
  const response = await fetch(articleUrl, {headers:{'user-agent':'Mozilla/5.0 VTG-News-Image/1.0','accept':'text/html,application/xhtml+xml'},redirect:'follow'});
  if (!response.ok) return null;
  const type = response.headers.get('content-type') || '';
  if (!type.includes('text/html')) return null;
  const html = (await response.text()).slice(0, 1200000);
  const image = htmlAttr(html,'og:image') || htmlAttr(html,'twitter:image');
  return isHttpUrl(image) ? image : null;
}

async function proxyImage(imageUrl, res) {
  if (!isHttpUrl(imageUrl)) return false;
  const r = await fetch(imageUrl,{headers:{'user-agent':'Mozilla/5.0 VTG-News-Image/1.0','accept':'image/avif,image/webp,image/apng,image/*,*/*;q=0.8'},redirect:'follow'});
  if (!r.ok) return false;
  const type=(r.headers.get('content-type')||'').split(';')[0];
  if(!type.startsWith('image/')) return false;
  const buffer=Buffer.from(await r.arrayBuffer());
  if(buffer.length>5*1024*1024) return false;
  res.set('Cache-Control','public, max-age=21600, stale-while-revalidate=86400');
  res.type(type).send(buffer);
  return true;
}

router.get('/news-image', async (req,res)=>{
  try {
    const source=clean(req.query.url);
    const image=await articleImage(source);
    if(!image || !(await proxyImage(image,res))) return res.status(404).json({error:'No publisher image available.'});
  } catch(e) { return res.status(502).json({error:'News image lookup unavailable.'}); }
});

router.get('/news-ai-image', async (req,res)=>{
  try {
    const title=clean(req.query.title).slice(0,500);
    const source=clean(req.query.source).slice(0,160);
    if(!title) return res.status(400).json({error:'News title is required.'});
    const key=crypto.createHash('sha256').update(title+'|'+source).digest('hex');
    const cached=generatedCache.get(key);
    if(cached){res.set('Cache-Control','public, max-age=86400');res.type('image/jpeg').send(cached);return;}
    const apiKey=process.env.GEMINI_API_KEY;
    if(!apiKey) return res.status(503).json({error:'AI image service is not configured.'});
    const prompt=`Create a professional editorial-style 16:9 AI illustration for a current business/trade news article. Headline: "${title}". Source: "${source}". Depict only the broad subject of the story (trade, shipping, ports, vehicles, manufacturing, finance, logistics, or markets as appropriate). Do not invent real people, logos, exact events, statistics, license plates, or identifiable real-world incident details. Make it clearly an illustrative visual, suitable for a serious trade publication.`;
    const r=await fetch('https://generativelanguage.googleapis.com/v1beta/interactions',{method:'POST',headers:{'x-goog-api-key':apiKey,'Content-Type':'application/json'},body:JSON.stringify({model:'gemini-3.1-flash-image',input:prompt,tools:[{type:'google_search'}],response_format:{type:'image',mime_type:'image/jpeg',aspect_ratio:'16:9',image_size:'0.5K'},store:false})});
    if(!r.ok) return res.status(502).json({error:'AI image generation unavailable.'});
    const data=await r.json();
    const raw=data?.output_image?.data;
    if(!raw) return res.status(502).json({error:'AI image was not returned.'});
    const buffer=Buffer.from(raw,'base64');
    if(buffer.length>2*1024*1024) return res.status(502).json({error:'AI image was too large.'});
    generatedCache.set(key,buffer); if(generatedCache.size>MAX_CACHE) generatedCache.delete(generatedCache.keys().next().value);
    res.set('Cache-Control','public, max-age=86400');res.type('image/jpeg').send(buffer);
  } catch(e){res.status(502).json({error:'AI image generation failed.'});}
});

module.exports = router;
