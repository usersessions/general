import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { stkPush, normalizePhone } from '@/lib/mpesa';

// Public endpoint gated by the unguessable invoice payment_token.
export async function POST(req: Request) {
  const { token, phone } = await req.json();
  if (!token || !phone) return NextResponse.json({ error: 'token and phone required' }, { status: 400 });

  const supabase = createAdminClient();
  const { data: invoice } = await supabase
    .from('sales_invoices')
    .select('id, invoice_number, status, amount_paid')
    .eq('payment_token', token)
    .single();
  if (!invoice) return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
  if (!['issued', 'partially_paid'].includes(invoice.status)) {
    return NextResponse.json({ error: `Invoice is not payable (${invoice.status})` }, { status: 400 });
  }

  const { data: totals } = await supabase.from('v_invoice_totals').select('total').eq('invoice_id', invoice.id).single();
  const balance = Number(totals?.total ?? 0) - Number(invoice.amount_paid);
  if (balance <= 0) return NextResponse.json({ error: 'Invoice already settled' }, { status: 400 });

  try {
    const { checkoutRequestId } = await stkPush({
      phone, amount: balance, accountReference: invoice.invoice_number,
    });
    await supabase.from('payments').insert({
      invoice_id: invoice.id,
      method: 'mpesa',
      amount: balance,
      phone: normalizePhone(phone),
      mpesa_checkout_request_id: checkoutRequestId,
      status: 'pending',
    });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 502 });
  }
}
