// Starts a MyFatoorah payment for a purchase and returns the page the customer pays on.
//
// Request:  POST, Authorization: Bearer <user access token>, JSON body { "purchaseId": "<uuid>" }   (nothing else is read)
// Response: 200 { "url": "<MyFatoorah payment page>" }
//
// The app never sends a price. The amount comes from PRODUCTS below, chosen by the product stored on the user's own
// purchase row; the return URLs and the gateway key are also server-side.
//
// Secrets (Supabase dashboard > Edge Functions > Secrets):
//   MYFATOORAH_API_KEY   required  (sandbox token while testing)
//   MYFATOORAH_BASE_URL  optional  default https://apitest.myfatoorah.com  (sandbox; live Kuwait is https://api.myfatoorah.com)
//   APP_URL              optional  default https://floosy-six.vercel.app   (where the customer returns to)
import { createClient } from 'npm:@supabase/supabase-js@2';

// Server-side price list. KWD 0.920 is about USD 2.99; change the number here to reprice.
const PRODUCTS: Record<string, { name: string; amount: number; currency: 'KWD' }> = {
  pro: { name: 'Floosy Pro', amount: 0.92, currency: 'KWD' }
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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

  const token = (req.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '');
  const { data: auth } = token ? await admin.auth.getUser(token) : { data: { user: null } };
  const user = auth.user;
  if (!user) return json({ error: 'Sign in to pay' }, 401);

  const apiKey = Deno.env.get('MYFATOORAH_API_KEY');
  if (!apiKey) return json({ error: 'Payments are not configured' }, 503);

  // Only the purchase id is read from the request.
  const purchaseId = (await req.json().catch(() => null))?.purchaseId;
  if (typeof purchaseId !== 'string' || !UUID.test(purchaseId)) return json({ error: 'Invalid purchase' }, 400);

  // The purchase must exist, be this user's, and still be unpaid.
  const { data: purchase } = await admin.from('purchases').select('id, product, payment_status').eq('id', purchaseId).eq('user_id', user.id).maybeSingle();
  if (!purchase) return json({ error: 'Purchase not found' }, 404);
  if (purchase.payment_status !== 'pending' && purchase.payment_status !== 'awaiting_payment') return json({ error: 'This purchase is already closed' }, 409);

  const product = PRODUCTS[purchase.product];
  if (!product) return json({ error: 'Unknown product' }, 400);

  const appUrl = (Deno.env.get('APP_URL') ?? 'https://floosy-six.vercel.app').replace(/\/+$/, '');
  const base = (Deno.env.get('MYFATOORAH_BASE_URL') ?? 'https://apitest.myfatoorah.com').replace(/\/+$/, '');
  const returnUrl = (result: string) => `${appUrl}/payment-result?purchase=${purchase.id}&result=${result}`;

  let res: Response;
  try {
    res = await fetch(`${base}/v2/SendPayment`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        CustomerName: (user.user_metadata?.display_name as string | undefined) || 'Floosy user',
        CustomerEmail: user.email,
        NotificationOption: 'LNK', // just give us the link, do not email or text the customer
        InvoiceValue: product.amount,
        DisplayCurrencyIso: product.currency,
        CustomerReference: purchase.id,
        CallBackUrl: returnUrl('success'),
        ErrorUrl: returnUrl('failed'),
        InvoiceItems: [{ ItemName: product.name, Quantity: 1, UnitPrice: product.amount }]
      }),
      signal: AbortSignal.timeout(20_000)
    });
  } catch (e) {
    console.error('myfatoorah request failed', String(e));
    return json({ error: 'Could not reach the payment gateway' }, 502);
  }

  const body = await res.json().catch(() => null);
  const url = body?.Data?.InvoiceURL;
  if (!res.ok || !body?.IsSuccess || typeof url !== 'string') {
    console.error('myfatoorah error', res.status, JSON.stringify(body).slice(0, 500));
    return json({ error: 'The payment gateway refused the request' }, 502);
  }

  // Remember what we charged and which gateway invoice it is (the webhook finds the purchase by invoice id).
  const { error } = await admin.from('purchases').update({ amount: product.amount, currency: product.currency, invoice_id: String(body.Data.InvoiceId), payment_status: 'awaiting_payment' }).eq('id', purchase.id);
  if (error) console.error('could not save invoice', error.message);

  return json({ url });
});
