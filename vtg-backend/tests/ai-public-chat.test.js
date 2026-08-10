const test = require('node:test');
const assert = require('node:assert/strict');

const aiController = require('../src/controllers/ai.controller');
const aiService = require('../src/services/ai.service');
const audit = require('../src/services/audit.service');

test('public chat forwards country and role to the AI service', async () => {
  let lastArgs;
  const originalPublicChat = aiService.publicChat;
  const originalAuditLog = audit.log;

  aiService.publicChat = async (...args) => {
    lastArgs = args;
    return { reply: 'ok', toolsUsed: [] };
  };
  audit.log = async () => {};

  const req = {
    body: {
      message: 'Need help signing up',
      history: [],
      country: 'Nigeria',
      role: 'buyer',
    },
    ip: '127.0.0.1',
  };
  const res = {
    json(payload) {
      this.payload = payload;
    },
  };

  await aiController.publicChat(req, res);
  await new Promise((resolve) => setImmediate(resolve));

  assert.equal(res.payload.reply, 'ok');
  assert.equal(lastArgs[0].country, 'Nigeria');
  assert.equal(lastArgs[0].role, 'buyer');

  aiService.publicChat = originalPublicChat;
  audit.log = originalAuditLog;
});

test('public chat still responds when audit logging fails', async () => {
  const originalPublicChat = aiService.publicChat;
  const originalAuditLog = audit.log;

  aiService.publicChat = async () => ({ reply: 'ok', toolsUsed: [] });
  audit.log = async () => {
    throw new Error('db unavailable');
  };

  const req = {
    body: {
      message: 'Need help signing up',
      history: [],
      country: 'Nigeria',
      role: 'buyer',
    },
    ip: '127.0.0.1',
  };
  const res = {
    json(payload) {
      this.payload = payload;
    },
  };

  try {
    await aiController.publicChat(req, res);
    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(res.payload.reply, 'ok');
  } finally {
    aiService.publicChat = originalPublicChat;
    audit.log = originalAuditLog;
  }
});
