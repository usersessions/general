import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { renderBusinessPdf } from '@/lib/pdf/documents';
import { sendDocumentEmail } from '@/lib/email';
import { loadInvoiceDoc } from '@/lib/sales-data';

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const result = await loadInvoiceDoc(supabase, id);
  if (!result) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const email = result.record.client?.email;
  if (!email) return NextResponse.json({ error: 'Client has no email address' }, { status: 400 });

  const pdf = await renderBusinessPdf(result.doc);
  const payToken = (result.record as any).payment_token;
  const payLink = payToken ? `${process.env.NEXT_PUBLIC_APP_URL}/pay/${payToken}` : null;
  try {
    await sendDocumentEmail({
      to: email,
      subject: `Invoice ${result.doc.number} - I&S General Supplies Ltd`,
      text: `Dear ${result.doc.clientName},\n\nPlease find attached invoice ${result.doc.number}.` +
        (payLink ? `\n\nPay conveniently via M-Pesa: ${payLink}` : '') +
        `\n\nRegards,\nI&S General Supplies Ltd`,
      filename: `${result.doc.number}.pdf`,
      pdf,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 502 });
  }
  return NextResponse.json({ ok: true });
}
