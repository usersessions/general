const BASE_URL =
  process.env.MPESA_ENV === 'production'
    ? 'https://api.safaricom.co.ke'
    : 'https://sandbox.safaricom.co.ke';

async function getAccessToken(): Promise<string> {
  const auth = Buffer.from(
    `${process.env.MPESA_CONSUMER_KEY}:${process.env.MPESA_CONSUMER_SECRET}`
  ).toString('base64');
  const res = await fetch(`${BASE_URL}/oauth/v1/generate?grant_type=client_credentials`, {
    headers: { Authorization: `Basic ${auth}` },
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`Daraja auth failed: ${res.status}`);
  const body = await res.json();
  return body.access_token;
}

export function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('254')) return digits;
  if (digits.startsWith('0')) return `254${digits.slice(1)}`;
  if (digits.startsWith('7') || digits.startsWith('1')) return `254${digits}`;
  return digits;
}

export async function stkPush({ phone, amount, accountReference }: {
  phone: string; amount: number; accountReference: string;
}): Promise<{ checkoutRequestId: string }> {
  const token = await getAccessToken();
  const shortcode = process.env.MPESA_SHORTCODE!;
  const timestamp = new Date().toISOString().replace(/[-:TZ.]/g, '').slice(0, 14);
  const password = Buffer.from(`${shortcode}${process.env.MPESA_PASSKEY}${timestamp}`).toString('base64');

  const res = await fetch(`${BASE_URL}/mpesa/stkpush/v1/processrequest`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      BusinessShortCode: shortcode,
      Password: password,
      Timestamp: timestamp,
      TransactionType: 'CustomerPayBillOnline',
      Amount: Math.ceil(amount), // Daraja requires whole shillings
      PartyA: normalizePhone(phone),
      PartyB: shortcode,
      PhoneNumber: normalizePhone(phone),
      CallBackURL: `${process.env.NEXT_PUBLIC_APP_URL}/api/mpesa/callback`,
      AccountReference: accountReference.slice(0, 12),
      TransactionDesc: `Invoice ${accountReference}`.slice(0, 13),
    }),
  });
  const body = await res.json();
  if (!res.ok || body.ResponseCode !== '0') {
    throw new Error(body.errorMessage ?? body.ResponseDescription ?? 'STK push failed');
  }
  return { checkoutRequestId: body.CheckoutRequestID };
}
