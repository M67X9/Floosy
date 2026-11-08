// Receives MyFatoorah webhooks (V2) and records the payment result on the purchase.
//
// Register once in the MyFatoorah portal (Integration Settings > Webhook Settings): this function's URL,
// version V2, event "Payment Status Changed", and the secure key option (that key is MYFATOORAH_WEBHOOK_SECRET).
// MyFatoorah has no per-payment webhook parameter; CallBackUrl / ErrorUrl in the payment request are only the
// pages the customer's browser returns to.
//
// Request:  POST JSON { Event: { Code, Name, ... }, Data: { Invoice: {...}, Transaction: {...}, ... } }
//           header  MyFatoorah-Signature = base64( HMAC-SHA256( secret, signature string ) )
//           signature string (event PAYMENT_STATUS_CHANGED), values null -> empty:
//           Invoice.Id=..,Invoice.Status=..,Transaction.Status=..,Transaction.PaymentId=..,Invoice.ExternalIdentifier=..
//
// What it does, in order:
//   1. checks the signature (rejects with 401 when it does not match);
//   2. finds the purchase by the gateway invoice id saved by initiate-payment;
//   3. asks MyFatoorah itself (GetPaymentStatus, with our API key) what happened, so the money state never rests on
//      the webhook body alone, and checks the paid amount matches what we charged;
//   4. sets purchases.payment_status to 'paid' or 'failed'. A paid purchase is never changed again.
//
// Secrets: MYFATOORAH_WEBHOOK_SECRET (required), MYFATOORAH_API_KEY (required), MYFATOORAH_BASE_URL (optional, sandbox by default).
import { createClient } from 'npm:@supabase/supabase-js@2';

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
  auth: { persistSession: false, autoRefreshToken: false }
});

const enc = new TextEncoder();

async function sign(secret: string, text: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const mac = new Uint8Array(await crypto.subtle.sign('HMAC', key, enc.encode(text)));
  let bin = '';
  for (const b of mac) bin += String.fromCharCode(b);
  return btoa(bin);
}

// Constant-time comparison, so response timing reveals nothing about the signature.
function same(a: string, b: string): boolean {
  const x = enc.encode(a), y = enc.encode(b);
  let diff = x.length ^ y.length;
  for (let i = 0; i < Math.max(x.length, y.length); i++) diff |= (x[i] ?? 0) ^ (y[i] ?? 0);
  return diff === 0;
}

const v = (x: unknown) => (x === null || x === undefined ? '' : String(x));

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const secret = Deno.env.get('MYFATOORAH_WEBHOOK_SECRET');
  const apiKey = Deno.env.get('MYFATOORAH_API_KEY');
  if (!secret || !apiKey) return json({ error: 'Webhook is not configured' }, 503); // fail closed

  const payload = await req.json().catch(() => null);
  const invoice = payload?.Data?.Invoice, transaction = payload?.Data?.Transaction;
  if (!payload || !invoice) return json({ error: 'Invalid payload' }, 400);

  // 1. Is this really MyFatoorah?
  const text = `Invoice.Id=${v(invoice.Id)},Invoice.Status=${v(invoice.Status)},Transaction.Status=${v(transaction?.Status)},Transaction.PaymentId=${v(transaction?.PaymentId)},Invoice.ExternalIdentifier=${v(invoice.ExternalIdentifier)}`;
  const given = req.headers.get('myfatoorah-signature') ?? '';
  if (!given || !same(await sign(secret, text), given)) {
    console.error('bad signature for invoice', v(invoice.Id));
    return json({ error: 'Invalid signature' }, 401);
  }

  // Only payment results matter here.
  const isPayment = String(payload.Event?.Code) === '1' || payload.Event?.Name === 'PAYMENT_STATUS_CHANGED';
  if (!isPayment) return json({ ignored: 'not a payment event' });

  // 2. Which purchase? (initiate-payment saved the gateway invoice id on it.)
  const invoiceId = v(invoice.Id);
  const { data: purchase } = await admin.from('purchases').select('id, payment_status, amount, currency').eq('invoice_id', invoiceId).maybeSingle();
  if (!purchase) return json({ ignored: 'unknown invoice' }); // not one of ours; 200 so MyFatoorah does not retry
  if (purchase.payment_status === 'paid') return json({ ok: true, payment_status: 'paid' }); // duplicate event

  // 3. Ask MyFatoorah what really happened.
  const base = (Deno.env.get('MYFATOORAH_BASE_URL') ?? 'https://apitest.myfatoorah.com').replace(/\/+$/, '');
  let inquiry: any;
  try {
    const res = await fetch(`${base}/v2/GetPaymentStatus`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ Key: invoiceId, KeyType: 'InvoiceId' }),
      signal: AbortSignal.timeout(20_000)
    });
    inquiry = await res.json();
    if (!res.ok || !inquiry?.IsSuccess) throw new Error(`status ${res.status}`);
  } catch (e) {
    console.error('GetPaymentStatus failed', String(e));
    return json({ error: 'Could not confirm the payment' }, 502); // MyFatoorah retries later
  }

  const data = inquiry.Data;
  const txs: any[] = Array.isArray(data?.InvoiceTransactions) ? data.InvoiceTransactions : [];
  const succeeded = txs.find((t) => t.TransactionStatus === 'Succss' || t.TransactionStatus === 'Success'); // MyFatoorah spells it "Succss"
  const paid = data?.InvoiceStatus === 'Paid' && !!succeeded;

  let next: 'paid' | 'failed' | null = null;
  if (paid) {
    // The amount MyFatoorah collected must be the amount we asked for, and the invoice must be the one we created.
    const expected = Number(purchase.amount);
    const matches = Math.abs(Number(data.InvoiceValue) - expected) < 0.0005 && String(data.CustomerReference ?? '') === purchase.id;
    if (!matches) {
      console.error('paid invoice does not match purchase', purchase.id, data.InvoiceValue, data.CustomerReference);
      return json({ ok: false, reason: 'mismatch' });
    }
    next = 'paid';
  } else if (['FAILED', 'CANCELED'].includes(v(transaction?.Status)) && data?.InvoiceStatus !== 'Paid') {
    next = 'failed';
  }
  if (!next) return json({ ok: true, payment_status: purchase.payment_status }); // still pending / authorizing: nothing to record

  // 4. Record it. Never touch a purchase that is already paid.
  const { error } = await admin.from('purchases')
    .update({ payment_status: next, payment_id: v(transaction?.PaymentId) || (succeeded?.PaymentId ?? null), paid_at: next === 'paid' ? new Date().toISOString() : null })
    .eq('id', purchase.id).neq('payment_status', 'paid');
  if (error) {
    console.error('could not update purchase', error.message);
    return json({ error: 'Could not save' }, 500);
  }
  return json({ ok: true, payment_status: next });
});
