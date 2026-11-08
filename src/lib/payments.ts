import { supabase } from './supabase';

// Starts a payment for Floosy Pro and returns the gateway page to send the customer to.
// The app only says WHICH product it wants: it creates a pending purchase row (the database refuses any other
// column), then hands the purchase id to the initiate-payment edge function, which decides the price.
export async function startProPayment(): Promise<string> {
  const { data: purchase, error } = await supabase.from('purchases').insert({ product: 'pro' }).select('id').single();
  if (error || !purchase) throw error ?? new Error('Could not start the purchase');
  const { data, error: fnError } = await supabase.functions.invoke<{ url: string }>('initiate-payment', { body: { purchaseId: purchase.id } });
  if (fnError || !data?.url) throw fnError ?? new Error('No payment link');
  return data.url;
}
