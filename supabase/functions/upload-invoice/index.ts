// Uploads one invoice photo to the private "Invoices" bucket using the service role,
// so the app no longer needs storage write access with its public key.
//
// Request:  POST, body = raw image bytes, Content-Type = image/jpeg | png | webp | heic | heif
// Response: 200 { "path": "<timestamp>-<random>.<ext>" }  (store this in Expenses.image)
import { createClient } from 'npm:@supabase/supabase-js@2';

const BUCKET = 'Invoices';
const MAX_BYTES = 10 * 1024 * 1024;
const EXT: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/heic': 'heic', 'image/heif': 'heif' };

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
  auth: { persistSession: false, autoRefreshToken: false }
});

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const type = (req.headers.get('content-type') ?? '').split(';')[0].trim().toLowerCase();
  const ext = EXT[type];
  if (!ext) return json({ error: 'Unsupported image type' }, 415);

  const declared = Number(req.headers.get('content-length') ?? 0);
  if (declared > MAX_BYTES) return json({ error: 'Image is larger than 10 MB' }, 413);

  const body = await req.arrayBuffer();
  if (body.byteLength === 0) return json({ error: 'Empty body' }, 400);
  if (body.byteLength > MAX_BYTES) return json({ error: 'Image is larger than 10 MB' }, 413);

  const path = `${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${ext}`;
  const { error } = await admin.storage.from(BUCKET).upload(path, body, { contentType: type, upsert: false });
  if (error) {
    console.error('upload failed', error.message);
    return json({ error: 'Upload failed' }, 500);
  }
  return json({ path });
});
