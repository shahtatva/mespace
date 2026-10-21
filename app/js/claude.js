/*
 * Reads photographed handwriting with Claude, from the browser, using the owner's own Anthropic API key.
 * The key is kept on this device (see settings), and a photo leaves the device only when it is read.
 * The SDK is bundled in app/vendor and loaded on first use, so the rest of the app never waits for it.
 */
import { bytesToBase64 } from './backup.js';
import { validDate } from './dates.js';

export const MODEL = 'claude-opus-5-5';
export const MODEL_NAME = 'Claude Opus 5.5';
// Dollars per million tokens for MODEL, used only to show an estimate of what reading has cost.
const PRICE = { input: 4, output: 20 };

let sdkPromise = null;
const loadSdk = () => (sdkPromise ||= import('../vendor/anthropic-sdk.js').then(m => m.default));

async function client(apiKey, Anthropic) {
  return new Anthropic({ apiKey, dangerouslyAllowBrowser: true, maxRetries: 2 });
}

export const PROMPT = `This photo shows a page from my handwritten paper journal. Transcribe it word for word.

- Copy exactly what is written. Keep my spelling, abbreviations and wording; do not correct, rephrase or summarize.
- Join lines that only wrap because the paper ran out, and put a blank line between paragraphs. Keep lists one item per line.
- Leave out crossed-out words.
- If you can only partly read a word, write your best guess followed by [?]. If you can't read it at all, write [illegible].
- For drawings or sketches, write a short note in square brackets, such as [sketch of a doorway].
- If the photo shows two facing pages, transcribe the left page first, then the right.
- Ignore anything that isn't part of the journal, such as the desk or the edge of another page.

Also give:
- date: the date written on the page as YYYY-MM-DD, or null if there isn't one. Read a two-digit year as 20xx.
- title: 2 to 6 words, taken from a heading on the page if it has one.
- legible: false if the photo doesn't show readable handwriting.`;

export const SCHEMA = {
  type: 'object',
  properties: {
    text: { type: 'string' },
    date: { anyOf: [{ type: 'string', format: 'date' }, { type: 'null' }] },
    title: { type: 'string' },
    legible: { type: 'boolean' },
  },
  required: ['text', 'date', 'title', 'legible'],
  additionalProperties: false,
};

export function buildRequest(imageBase64, mediaType = 'image/jpeg') {
  return {
    model: MODEL,
    max_tokens: 16000,
    // Accuracy matters more than speed or cost here, so read with more care than the default.
    output_config: { effort: 'high', format: { type: 'json_schema', schema: SCHEMA } },
    // If a safety filter declines a page, the API retries it on another model instead of failing.
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    messages: [{
      role: 'user',
      content: [
        { type: 'image', source: { type: 'base64', media_type: mediaType, data: imageBase64 } },
        { type: 'text', text: PROMPT },
      ],
    }],
  };
}

export class ReadError extends Error {
  /** reason: 'bad-key' | 'no-permission' | 'billing' | 'busy' | 'offline' | 'refused' | 'unreadable-reply' | 'failed' */
  constructor(reason, detail = '') { super(detail || reason); this.reason = reason; }
}

/** Turns a Messages API response into { text, date, title, legible }, or throws ReadError. */
export function parseResponse(response) {
  if (response.stop_reason === 'refusal') throw new ReadError('refused');
  if (response.stop_reason === 'max_tokens') throw new ReadError('unreadable-reply', 'reply was cut off');
  const block = (response.content || []).find(b => b.type === 'text');
  let data;
  try { data = JSON.parse(block ? block.text : ''); } catch { throw new ReadError('unreadable-reply'); }
  return {
    text: typeof data.text === 'string' ? data.text.trim() : '',
    date: validDate(data.date),
    title: typeof data.title === 'string' ? data.title.trim().slice(0, 200) : '',
    legible: data.legible !== false,
  };
}

/** Maps SDK errors to the reasons the app explains to the reader. Most specific classes first. */
function classify(e, Anthropic) {
  if (e instanceof ReadError) return e;
  if (e && e.name === 'AbortError') return new ReadError('cancelled');
  if (e instanceof Anthropic.AuthenticationError) return new ReadError('bad-key', e.message);
  if (e instanceof Anthropic.PermissionDeniedError) return new ReadError('no-permission', e.message);
  if (e instanceof Anthropic.RateLimitError) return new ReadError('busy', e.message);
  if (e instanceof Anthropic.APIUserAbortError) return new ReadError('cancelled');
  if (e instanceof Anthropic.APIConnectionError) return new ReadError(navigator.onLine === false ? 'offline' : 'busy', e.message);
  if (e instanceof Anthropic.InternalServerError) return new ReadError('busy', e.message);
  if (e instanceof Anthropic.APIError) {
    if (e.status === 402 || e.type === 'billing_error') return new ReadError('billing', e.message);
    if (e.status === 529 || e.type === 'overloaded_error') return new ReadError('busy', e.message);
    return new ReadError('failed', e.message);
  }
  return new ReadError('failed', String(e && e.message || e));
}

/**
 * Reads one photo. `photo` is { data: ArrayBuffer, type } as stored, or a Blob.
 * Resolves { text, date, title, legible, usage }.
 */
export async function readPage(apiKey, photo, { signal } = {}) {
  const Anthropic = await loadSdk();
  try {
    const bytes = photo instanceof Blob ? await photo.arrayBuffer() : photo.data;
    const type = (photo instanceof Blob ? photo.type : photo.type) || 'image/jpeg';
    const c = await client(apiKey, Anthropic);
    const response = await c.beta.messages.create(buildRequest(bytesToBase64(new Uint8Array(bytes)), type), { signal });
    return { ...parseResponse(response), usage: response.usage || {} };
  } catch (e) {
    throw classify(e, Anthropic);
  }
}

/** Checks a key without spending tokens. Resolves true, or throws ReadError. */
export async function checkKey(apiKey) {
  const Anthropic = await loadSdk();
  try {
    await (await client(apiKey, Anthropic)).models.retrieve(MODEL);
    return true;
  } catch (e) {
    throw classify(e, Anthropic);
  }
}

export const estimateCost = ({ inputTokens = 0, outputTokens = 0 } = {}) =>
  (inputTokens * PRICE.input + outputTokens * PRICE.output) / 1e6;

export const READ_ERRORS = {
  'bad-key': 'Anthropic rejected the API key. Check it in Settings.',
  'no-permission': 'This API key isn’t allowed to use ' + MODEL_NAME + '.',
  billing: 'Your Anthropic account is out of credit.',
  busy: 'Claude is busy right now. Try again in a minute.',
  offline: 'You’re offline. Reading needs an internet connection.',
  refused: 'Claude declined to read this page.',
  'unreadable-reply': 'Claude’s answer couldn’t be used. Try again.',
  failed: 'Something went wrong reading the page. Try again.',
  'no-photo': 'This page’s photo is missing.',
  cancelled: '',
};
