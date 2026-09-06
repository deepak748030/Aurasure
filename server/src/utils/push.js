'use strict';

/**
 * Expo push delivery.
 *
 * The vendor and rider apps register an Expo push token
 * (`ExponentPushToken[...]`). This helper posts messages to Expo's push
 * service, prunes tokens the service reports as dead, and never throws into
 * the request path — a failed notification must not fail an order.
 *
 * No SDK dependency: Node 18+ ships global `fetch`.
 */

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
const CHUNK_SIZE = 100;
const TIMEOUT_MS = 8000;

/** Expo accepts `ExponentPushToken[xxx]` and the legacy `ExpoPushToken[xxx]`. */
function isExpoPushToken(token) {
  return typeof token === 'string' && /^Expo(nent)?PushToken\[[^\]]+\]$/.test(token.trim());
}

function chunk(list, size) {
  const out = [];
  for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size));
  return out;
}

async function postChunk(messages) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'accept-encoding': 'gzip, deflate',
        'content-type': 'application/json',
      },
      body: JSON.stringify(messages),
      signal: controller.signal,
    });
    const json = await res.json().catch(() => null);
    if (!res.ok || !json) return messages.map(() => null);
    return Array.isArray(json.data) ? json.data : messages.map(() => null);
  } catch (err) {
    console.warn('[push] send failed:', err.message);
    return messages.map(() => null);
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Sends one payload to many tokens.
 *
 * @returns {Promise<{ sent: number, invalidTokens: string[] }>} tokens Expo
 *   rejected as unregistered, so the caller can drop them from its document.
 */
async function sendExpoPush(tokens, payload = {}) {
  const unique = [...new Set((tokens || []).map((t) => String(t || '').trim()).filter(isExpoPushToken))];
  if (!unique.length) return { sent: 0, invalidTokens: [] };

  const base = {
    title: payload.title || 'Aurasure',
    body: payload.body || '',
    data: payload.data || {},
    sound: payload.sound === null ? null : payload.sound || 'default',
    priority: payload.priority || 'high',
    channelId: payload.channelId || 'default',
  };
  if (payload.badge !== undefined) base.badge = payload.badge;
  // Android heads-up + wake the screen for time-critical kitchen alerts.
  if (payload.ttl !== undefined) base.ttl = payload.ttl;
  if (payload.categoryId) base.categoryId = payload.categoryId;
  if (payload.interruptionLevel) base.interruptionLevel = payload.interruptionLevel;

  const messages = unique.map((to) => ({ to, ...base }));
  const invalidTokens = [];
  let sent = 0;

  const batches = chunk(messages, CHUNK_SIZE);
  for (const batch of batches) {
    // eslint-disable-next-line no-await-in-loop
    const tickets = await postChunk(batch);
    tickets.forEach((ticket, index) => {
      if (!ticket) return;
      if (ticket.status === 'ok') {
        sent += 1;
        return;
      }
      const code = ticket.details && ticket.details.error;
      if (code === 'DeviceNotRegistered' || code === 'InvalidCredentials') {
        invalidTokens.push(batch[index].to);
      }
    });
  }

  return { sent, invalidTokens };
}

module.exports = { sendExpoPush, isExpoPushToken };
