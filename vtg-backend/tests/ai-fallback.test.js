const test = require('node:test');
const assert = require('node:assert/strict');

const aiService = require('../src/services/ai.service');

test('public chat falls back to a built-in reply when Anthropic is not configured', async () => {
  const originalKey = process.env.ANTHROPIC_API_KEY;
  delete process.env.ANTHROPIC_API_KEY;

  try {
    const result = await aiService.publicChat({ history: [], country: 'Nigeria', role: 'buyer' });
    assert.ok(result.reply);
    assert.match(result.reply.toLowerCase(), /nigeria|buyer|sign up|bvn/i);
  } finally {
    if (originalKey === undefined) delete process.env.ANTHROPIC_API_KEY;
    else process.env.ANTHROPIC_API_KEY = originalKey;
  }
});

test('fallback replies to login and signup details using the supplied country and role', async () => {
  const originalKey = process.env.ANTHROPIC_API_KEY;
  delete process.env.ANTHROPIC_API_KEY;

  try {
    const result = await aiService.publicChat({
      history: [{ role: 'user', content: 'I am trying to sign in with my email from Ghana as a buyer' }],
      country: 'Ghana',
      role: 'buyer',
    });
    assert.ok(result.reply);
    assert.match(result.reply.toLowerCase(), /ghana|email|password|credential|ghana card/i);
  } finally {
    if (originalKey === undefined) delete process.env.ANTHROPIC_API_KEY;
    else process.env.ANTHROPIC_API_KEY = originalKey;
  }
});
