const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const isProduction = process.env.NODE_ENV === 'production';
const provider = (process.env.OBJECT_STORAGE_PROVIDER || (isProduction ? 's3' : 'local')).toLowerCase();

if (isProduction && provider === 'local') {
  throw new Error('Local file storage is not permitted in production. Configure OBJECT_STORAGE_PROVIDER=s3.');
}

function required(name) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required when object storage provider is ${provider}.`);
  return value;
}

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}
function hmac(key, value) {
  return crypto.createHmac('sha256', key).update(value).digest();
}

async function s3Request({ method, key, body, contentType }) {
  const bucket = required('S3_BUCKET');
  const region = process.env.S3_REGION || 'us-east-1';
  const endpoint = process.env.S3_ENDPOINT || `https://s3.${region}.amazonaws.com`;
  const accessKey = required('S3_ACCESS_KEY_ID');
  const secretKey = required('S3_SECRET_ACCESS_KEY');
  const forcePathStyle = process.env.S3_FORCE_PATH_STYLE === 'true';

  const encodedKey = key.split('/').map(encodeURIComponent).join('/');
  const base = endpoint.replace(/\/$/, '');
  const url = forcePathStyle
    ? `${base}/${encodeURIComponent(bucket)}/${encodedKey}`
    : `${base}/${bucket}/${encodedKey}`;

  const parsed = new URL(url);
  const host = parsed.host;
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
  const dateStamp = amzDate.slice(0, 8);
  const payloadHash = sha256(body || '');

  const canonicalHeaders =
    `host:${host}\n` +
    `x-amz-content-sha256:${payloadHash}\n` +
    `x-amz-date:${amzDate}\n`;
  const signedHeaders = 'host;x-amz-content-sha256;x-amz-date';
  const canonicalRequest = [
    method,
    parsed.pathname,
    parsed.search ? parsed.search.slice(1) : '',
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join('\n');

  const service = 's3';
  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
  const stringToSign = [
    'AWS4-HMAC-SHA256',
    amzDate,
    credentialScope,
    sha256(canonicalRequest),
  ].join('\n');

  const kDate = hmac(`AWS4${secretKey}`, dateStamp);
  const kRegion = hmac(kDate, region);
  const kService = hmac(kRegion, service);
  const kSigning = hmac(kService, 'aws4_request');
  const signature = crypto.createHmac('sha256', kSigning).update(stringToSign).digest('hex');

  const authorization =
    `AWS4-HMAC-SHA256 Credential=${accessKey}/${credentialScope}, ` +
    `SignedHeaders=${signedHeaders}, Signature=${signature}`;

  const headers = {
    host,
    'x-amz-content-sha256': payloadHash,
    'x-amz-date': amzDate,
    authorization,
  };
  if (contentType) headers['content-type'] = contentType;

  const response = await fetch(url, {
    method,
    headers,
    body: body || undefined,
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error(`Object storage ${method} failed (${response.status}): ${detail.slice(0, 500)}`);
  }
  return response;
}

async function putObject({ key, buffer, contentType }) {
  if (provider === 'local') {
    const base = process.env.LOCAL_UPLOAD_DIR || path.join(process.cwd(), 'uploads');
    const target = path.join(base, key);
    const normalizedBase = path.resolve(base) + path.sep;
    const normalizedTarget = path.resolve(target);
    if (!normalizedTarget.startsWith(normalizedBase)) throw new Error('Invalid storage key.');
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, buffer);
    return { key, provider: 'local' };
  }
  if (provider === 's3') {
    await s3Request({ method: 'PUT', key, body: buffer, contentType });
    return { key, provider: 's3' };
  }
  throw new Error(`Unsupported OBJECT_STORAGE_PROVIDER: ${provider}`);
}

async function getObject({ key }) {
  if (provider === 'local') {
    const base = process.env.LOCAL_UPLOAD_DIR || path.join(process.cwd(), 'uploads');
    const target = path.join(base, key);
    const normalizedBase = path.resolve(base) + path.sep;
    const normalizedTarget = path.resolve(target);
    if (!normalizedTarget.startsWith(normalizedBase)) throw new Error('Invalid storage key.');
    return fs.readFileSync(target);
  }
  if (provider === 's3') {
    const response = await s3Request({ method: 'GET', key });
    return Buffer.from(await response.arrayBuffer());
  }
  throw new Error(`Unsupported OBJECT_STORAGE_PROVIDER: ${provider}`);
}

module.exports = { putObject, getObject, provider };
