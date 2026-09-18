const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 5;
const hits = new Map();

function getClientIp(request) {
  const forwardedFor = request.headers.get('x-forwarded-for') || '';
  return forwardedFor.split(',')[0].trim() || 'unknown';
}

function isRateLimited(request) {
  const ip = getClientIp(request);
  const now = Date.now();
  const timestamps = (hits.get(ip) || []).filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
  timestamps.push(now);
  hits.set(ip, timestamps);
  return timestamps.length > RATE_LIMIT_MAX_REQUESTS;
}

function isHoneypotFilled(body) {
  return Boolean(body.website && body.website.trim() !== '');
}

module.exports = { isRateLimited, isHoneypotFilled };
