/**
 * Bachs API helpers — server only. Never import from client.
 * Env key names accepted (Vercel):
 *   BATCHS_API_KEY | BACHS_API_KEY | BATCH_API_KEY
 * Optional: BACHS_BASE_URL / BATCHS_BASE_URL
 */
export function getBachsApiKey() {
  return (
    process.env.BATCHS_API_KEY ||
    process.env.BACHS_API_KEY ||
    process.env.BATCH_API_KEY ||
    ''
  ).trim();
}

export function bachsBaseUrl(apiKey = getBachsApiKey()) {
  const override = process.env.BACHS_BASE_URL || process.env.BATCHS_BASE_URL || '';
  if (override) return override.replace(/\/$/, '');
  if (String(apiKey).startsWith('sk_sandbox_')) return 'https://sandbox-api.bachs.io';
  return 'https://api.bachs.io';
}

export async function bachsFetch(path, { method = 'GET', body, apiKey } = {}) {
  const key = apiKey || getBachsApiKey();
  if (!key) {
    const err = new Error('BATCHS_API_KEY (or BACHS_API_KEY) is not configured');
    err.status = 500;
    throw err;
  }
  const url = bachsBaseUrl(key) + path;
  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${key}`,
      Accept: 'application/json',
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text };
  }
  if (!res.ok) {
    const err = new Error(data?.message || data?.error || `Bachs ${res.status}`);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

export function amountToBachs(naira) {
  const n = Math.round(Number(naira) || 0);
  return n.toFixed(2);
}
