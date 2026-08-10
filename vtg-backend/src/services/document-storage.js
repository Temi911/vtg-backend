const crypto = require('crypto');
const path = require('path');
const { putObject, getObject, provider } = require('../storage/object-storage');

function sanitizeName(name) {
  return path.basename(String(name || 'file'))
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .slice(0, 120);
}

function buildStorageKey({ userId, orderId, lcId, originalName }) {
  const scope = lcId ? `lc/${lcId}` : `order/${orderId || 'unassigned'}`;
  const safe = sanitizeName(originalName);
  return `documents/${scope}/${userId}/${crypto.randomUUID()}-${safe}`;
}

async function storeDocument({ userId, orderId, lcId, originalName, buffer, contentType }) {
  const key = buildStorageKey({ userId, orderId, lcId, originalName });
  const result = await putObject({ key, buffer, contentType });
  return {
    storageProvider: result.provider,
    storageKey: result.key,
    originalName: safeName(originalName),
    contentType: contentType || 'application/octet-stream',
  };
}

async function readDocument({ storageProvider, storageKey }) {
  if (!storageKey) throw new Error('Document storage key is missing.');
  // Current deployment supports the configured provider. The DB provider is
  // checked so records cannot silently point at a different backend.
  if (storageProvider && storageProvider !== provider) {
    throw new Error(`Document belongs to storage provider ${storageProvider}, but this server uses ${provider}.`);
  }
  return getObject({ key: storageKey });
}

function safeName(name) {
  return sanitizeName(name);
}

module.exports = { storeDocument, readDocument, buildStorageKey };
