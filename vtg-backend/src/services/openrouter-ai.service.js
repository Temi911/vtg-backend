const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || 'openrouter/free';

function enabled() {
  return Boolean(process.env.OPENROUTER_API_KEY);
}

function buildSystem(country, role) {
  return [
    'You are VTG AI, the trade-intelligence assistant for Vintage Trade Global, an Africa-China-world B2B marketplace.',
    `User country/context: ${country || "the user's current country"}. User role: ${role || 'visitor'}.`,
    'Give practical, commercially useful guidance about sourcing, vehicles, products, import/export, customs, tariffs, VAT, shipping, ports, logistics, FX, trade finance and landed cost.',
    'Do not invent current rates, tariffs, regulations, government requirements, company facts or shipping conditions. If current verification is unavailable, clearly say that the answer is an estimate or that live verification is required.',
    'For Nigeria questions, prefer Nigeria Customs Service, Central Bank of Nigeria, Nigerian Ports Authority and other Nigerian government/regulator sources when the user supplies sources or when current verification is available.',
    'For landed-cost questions, collect relevant inputs such as product/vehicle specification, quantity, purchase price and currency, origin, destination port, freight/insurance if known, and applicable taxes or charges. Never substitute unrelated identity information such as BVN unless the user explicitly asks about it.',
    'Do not claim to be Claude. You are VTG AI using the secondary OpenRouter provider.',
    'Be useful immediately, then ask only for details that materially affect the answer.',
  ].join(' ');
}

async function publicChat({ message, history = [], country, role }) {
  if (!enabled()) return null;

  const messages = [
    { role: 'system', content: buildSystem(country, role) },
    ...history.slice(-10).map(item => ({
      role: item.role === 'assistant' ? 'assistant' : 'user',
      content: String(item.content || ''),
    })),
    { role: 'user', content: String(message || '') },
  ];

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 45000);
  try {
    const response = await fetch(OPENROUTER_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'HTTP-Referer': process.env.PUBLIC_APP_URL || 'https://vtg-staging.vercel.app',
        'X-Title': 'Vintage Trade Global AI',
      },
      body: JSON.stringify({
        model: OPENROUTER_MODEL,
        messages,
        max_tokens: 1600,
        temperature: 0.2,
      }),
      signal: controller.signal,
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data?.error?.message || `OpenRouter returned HTTP ${response.status}`);
    }

    const reply = data?.choices?.[0]?.message?.content;
    if (!reply || typeof reply !== 'string') throw new Error('OpenRouter returned no text.');

    return {
      reply: reply.trim(),
      toolsUsed: [],
      provider: OPENROUTER_MODEL,
    };
  } finally {
    clearTimeout(timeout);
  }
}

module.exports = { enabled, publicChat };
