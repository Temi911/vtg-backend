const base = (process.env.VTG_API_BASE || '').replace(/\/$/, '');
if (!base) {
  console.error('Set VTG_API_BASE, e.g. https://api-staging.example.com/api');
  process.exit(1);
}
(async () => {
  const res = await fetch(`${base}/health`);
  const text = await res.text();
  if (!res.ok) {
    console.error(`Health check failed: HTTP ${res.status} ${text}`);
    process.exit(1);
  }
  console.log(`VTG staging health: HTTP ${res.status}`);
  console.log(text);
})();
