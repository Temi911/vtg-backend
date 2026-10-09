module.exports = (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: { code: 'METHOD_NOT_ALLOWED', message: 'Use GET for assistant status.' } });
  }
  const configured = Boolean(process.env.OPENAI_API_KEY || process.env.VTG_AI_API_KEY);
  return res.status(200).json({ service: 'vtg-ai-assistant', configured, provider: configured ? (process.env.VTG_AI_BASE_URL ? 'compatible-api' : 'openai-compatible') : null });
};
