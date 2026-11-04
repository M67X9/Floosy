// Reads an invoice / receipt photo with a free OpenRouter vision model and returns the expense details.
//
// Request:  POST, body = raw image bytes, Content-Type = image/jpeg | png | webp
// Response: 200 { amount: number|null, date: "YYYY-MM-DD"|null, category: CatId|null, description: string|null }
//           A field is null when the model could not read it. The app only fills the fields that are present.
//
// Secrets (Supabase dashboard > Edge Functions > Secrets):
//   OPENROUTER_API_KEY  required
//   OPENROUTER_MODELS   optional, comma-separated model ids tried in order (free models come and go)
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const DEFAULT_MODELS = ['google/gemma-4-31b-it:free', 'nvidia/nemotron-3.5-super-vl:free', 'google/gemma-4-26b-a4b-it:free'];
const MAX_BYTES = 4 * 1024 * 1024;
const TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const CATS = ['food', 'ent', 'subs', 'loan', 'fuel', 'shop', 'trans', 'bills', 'health', 'other'];

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

const PROMPT = `You read invoices and receipts. Look at the image and reply with ONLY one JSON object, no other text:
{"total": number|null, "currency": string|null, "date": "YYYY-MM-DD"|null, "category": string|null, "description": string|null}
- total: the final amount paid (grand total, after tax and discounts) as a plain number, no symbols.
- currency: ISO code or symbol printed on the receipt (e.g. "KWD", "KD", "د.ك", "USD"), or null if none is shown.
- date: the purchase date as YYYY-MM-DD, or null.
- category: exactly one of ${CATS.join(', ')} (food = restaurants/groceries/coffee, ent = entertainment, subs = subscriptions, loan = loan payments, fuel = petrol/gas, shop = shopping, trans = taxis/transport, bills = utilities/phone/internet, health = pharmacy/clinic, other = anything else), or null if unsure.
- description: the merchant or a 2-4 word summary, max 40 characters, in the language printed on the receipt.
Use null for anything you cannot read clearly. Never guess a number.`;

function toBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}

// Models sometimes wrap the JSON in ``` fences or add a sentence around it.
function parseJson(text: string): Record<string, unknown> | null {
  const start = text.indexOf('{'), end = text.lastIndexOf('}');
  if (start < 0 || end <= start) return null;
  try { return JSON.parse(text.slice(start, end + 1)); } catch { return null; }
}

const KWD = /^(kwd|kd|k\.d\.?|د\.ك\.?|دينار.*|kuwaiti.*)$/i;

function clean(raw: Record<string, unknown>) {
  const currency = typeof raw.currency === 'string' ? raw.currency.trim() : '';
  let amount: number | null = null;
  const t = typeof raw.total === 'string' ? parseFloat(raw.total.replace(/,/g, '')) : raw.total;
  // Floosy only tracks Kuwaiti dinar: an amount in another currency would be wrong, so leave it for the user.
  if (typeof t === 'number' && isFinite(t) && t > 0 && t < 1_000_000 && (!currency || KWD.test(currency))) amount = Math.round(t * 1000) / 1000;

  let date: string | null = null;
  if (typeof raw.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(raw.date)) {
    const d = new Date(raw.date + 'T00:00:00Z');
    if (!isNaN(d.getTime()) && d.toISOString().slice(0, 10) === raw.date) date = raw.date;
  }

  const category = typeof raw.category === 'string' && CATS.includes(raw.category.trim().toLowerCase()) ? raw.category.trim().toLowerCase() : null;
  const description = typeof raw.description === 'string' && raw.description.trim() ? raw.description.trim().slice(0, 60) : null;
  return { amount, date, category, description };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const key = Deno.env.get('OPENROUTER_API_KEY');
  if (!key) return json({ error: 'Autofill is not configured' }, 503);

  const type = (req.headers.get('content-type') ?? '').split(';')[0].trim().toLowerCase();
  if (!TYPES.includes(type)) return json({ error: 'Unsupported image type' }, 415);
  const body = await req.arrayBuffer();
  if (body.byteLength === 0) return json({ error: 'Empty body' }, 400);
  if (body.byteLength > MAX_BYTES) return json({ error: 'Image is larger than 4 MB' }, 413);

  const models = (Deno.env.get('OPENROUTER_MODELS') ?? '').split(',').map((m) => m.trim()).filter(Boolean);
  const dataUrl = `data:${type};base64,${toBase64(body)}`;

  let res: Response;
  try {
    res = await fetch(OPENROUTER_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', 'X-Title': 'Floosy' },
      body: JSON.stringify({
        models: models.length ? models : DEFAULT_MODELS,
        temperature: 0,
        max_tokens: 2000,
        messages: [{ role: 'user', content: [{ type: 'text', text: PROMPT }, { type: 'image_url', image_url: { url: dataUrl } }] }]
      }),
      signal: AbortSignal.timeout(45_000)
    });
  } catch (e) {
    console.error('openrouter request failed', String(e));
    return json({ error: 'Could not reach the reading service' }, 502);
  }

  if (!res.ok) {
    console.error('openrouter error', res.status, (await res.text()).slice(0, 300));
    return json({ error: res.status === 429 ? 'Too many requests, try again in a minute' : 'Could not read the invoice' }, res.status === 429 ? 429 : 502);
  }

  const data = await res.json();
  const content = data?.choices?.[0]?.message?.content;
  const parsed = typeof content === 'string' ? parseJson(content) : null;
  if (!parsed) {
    console.error('unparseable reply', data?.model, data?.choices?.[0]?.finish_reason, JSON.stringify(data?.choices?.[0]?.message ?? data).slice(0, 400));
    return json({ error: 'Could not read the invoice' }, 422);
  }
  return json(clean(parsed));
});
