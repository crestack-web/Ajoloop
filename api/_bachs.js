/**
 * Bachs API helpers — server only. Never import from client.
 * Env: BACHS_API_KEY (required), BACHS_BASE_URL (optional override)
 */
export function bachsBaseUrl(apiKey = process.env.BACHS_API_KEY || '') {
  if (process.env.BACHS_BASE_URL) return process.env.BACHS_BASE_URL.replace(/\/$/, '');
  if (String(apiKey).startsWith('sk_sandbox_')) return 'https://sandbox-api.bachs.io';
  return 'https://api.bachs.io';
}

export async function bachsFetch(path, { method = 'GET', body, apiKey } = {}) {
  const key = apiKey || process.env.BACHS_API_KEY;
  if (!key) {
    const err = new Error('BACHS_API_KEY is not configured');
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
  return (n).toFixed(2);
}
