import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

// Daraja STK Push result callback. Always return 200 so Safaricom stops retrying;
// reconciliation state lives in the payments table.
export async function POST(req: Request) {
  let payload: any;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ ResultCode: 0, ResultDesc: 'Accepted' });
  }

  const cb = payload?.Body?.stkCallback;
  if (!cb?.CheckoutRequestID) return NextResponse.json({ ResultCode: 0, ResultDesc: 'Accepted' });

  const supabase = createAdminClient();
  const { data: payment } = await supabase
    .from('payments')
    .select('id, status')
    .eq('mpesa_checkout_request_id', cb.CheckoutRequestID)
    .single();

  if (payment && payment.status === 'pending') {
    if (cb.ResultCode === 0) {
      const items: any[] = cb.CallbackMetadata?.Item ?? [];
      const receipt = items.find((i) => i.Name === 'MpesaReceiptNumber')?.Value ?? null;
      const amount = items.find((i) => i.Name === 'Amount')?.Value;
      await supabase
        .from('payments')
        .update({
          status: 'completed',
          mpesa_receipt_number: receipt,
          ...(amount ? { amount } : {}),
        })
        .eq('id', payment.id);
    } else {
      await supabase.from('payments').update({ status: 'failed' }).eq('id', payment.id);
    }
  }

  return NextResponse.json({ ResultCode: 0, ResultDesc: 'Accepted' });
}
