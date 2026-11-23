'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..','..');
const read=f=>fs.readFileSync(path.join(root,f),'utf8');

test('regional Trade Feed stores and serves Africa, China and South Korea labels',()=>{
 const migration=read('supabase/migrations/20261123211000_vtg_trade_feed_regional_classification.sql');
 const api=read('supabase/functions/vtg-marketplace/index.ts');
 assert.match(migration,/region in \('Africa','China','South Korea'\)/);
 assert.match(migration,/vtg_trade_posts_region_created_idx/);
 assert.match(api,/country_code,region,created_at/);
 assert.match(api,/countryCode,region,is_published/);
});

test('news intelligence requests all three regions and includes provider image metadata safely',()=>{
 const news=read('supabase/functions/vtg-market-intelligence/index.ts');
 assert.match(news,/region:"Africa"/);
 assert.match(news,/region:"China"/);
 assert.match(news,/region:"South Korea"/);
 assert.match(news,/media:content/);
 assert.match(news,/socialimage/);
 assert.match(news,/imageUrl/);
 assert.match(news,/trusted/);
});

test('public and account Trade Feeds provide region filters, photo cards, likes, comments and follows',()=>{
 for(const file of ['trade-feed.html','account-trade-feed.html']){
  const html=read(file);
  assert.match(html,/id="regionFilters"/);
  assert.match(html,/data-region-filter="Africa"/);
  assert.match(html,/data-region-filter="China"/);
  assert.match(html,/data-region-filter="South Korea"/);
  assert.match(html,/news-image/);
  assert.match(html,/data-filter="following"|data-filter="all"/);
  assert.match(html,/data-like|data-follow|data-comment|likePost|followUser|toggleComments/);
 }
});

test('buyer dashboard feed supports region selection, photo uploads, likes, comments and follows',()=>{
 const html=read('buyer-dashboard.html'),js=read('vtg-buyer-trade-feed-supabase.js');
 assert.match(html,/id="liveTradePostRegion"/);
 assert.match(html,/id="liveTradePostFiles"/);
 assert.match(html,/id="liveTradeFeedRegionFilter"/);
 assert.match(js,/vtg_trade_post_media/);
 assert.match(js,/vtg_user_follows/);
 assert.match(js,/data-sb-follow/);
 assert.match(js,/data-sb-like/);
 assert.match(js,/data-sb-comment-form/);
 assert.match(js,/storage\.from\('vtg-trade-feed-media'\)/);
});
