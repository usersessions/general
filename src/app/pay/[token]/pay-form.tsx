'use client';

import { useState } from 'react';

export default function PayForm({ token }: { token: string }) {
  const [phone, setPhone] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'sent'>('idle');
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setState('sending'); setError(null);
    const res = await fetch('/api/mpesa/stk-push', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, phone }),
    });
    const body = await res.json();
    if (!res.ok) { setError(body.error ?? 'Payment request failed'); setState('idle'); return; }
    setState('sent');
  }

  if (state === 'sent') {
    return (
      <p>
        Payment request sent. Check your phone and enter your <strong>M-Pesa PIN</strong> to
        complete payment. You will receive an M-Pesa confirmation SMS.
      </p>
    );
  }

  return (
    <form onSubmit={submit} style={{ display: 'grid', gap: '0.75rem' }}>
      {error && <p className="error">{error}</p>}
      <label>
        M-Pesa phone number
        <input required placeholder="07XX XXX XXX" value={phone} onChange={(e) => setPhone(e.target.value)} />
      </label>
      <button className="btn-primary" type="submit" disabled={state === 'sending'}>
        {state === 'sending' ? 'Sending...' : 'Pay with M-Pesa'}
      </button>
    </form>
  );
}
