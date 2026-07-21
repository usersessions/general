'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function ExpenseForm({ departments, accounts }: {
  departments: { id: string; name: string }[];
  accounts: { code: string; name: string }[];
}) {
  const router = useRouter();
  const supabase = createClient();
  const [f, setF] = useState({ description: '', amount: '', department_id: '', account_code: '6000', expense_date: '' });
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const { error } = await supabase.from('expenses').insert({
      description: f.description,
      amount: Number(f.amount),
      department_id: f.department_id || null,
      account_code: f.account_code,
      ...(f.expense_date ? { expense_date: f.expense_date } : {}),
    });
    if (error) { setError(error.message); return; }
    setF({ ...f, description: '', amount: '' });
    router.refresh();
  }

  return (
    <form onSubmit={submit} style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
      {error && <p className="error" style={{ width: '100%' }}>{error}</p>}
      <label>Description<br /><input required value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} style={{ width: 240 }} /></label>
      <label>Amount (KES)<br /><input required type="number" step="0.01" value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} style={{ width: 120 }} /></label>
      <label>Department<br />
        <select value={f.department_id} onChange={(e) => setF({ ...f, department_id: e.target.value })}>
          <option value="">None</option>
          {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
      </label>
      <label>Account<br />
        <select value={f.account_code} onChange={(e) => setF({ ...f, account_code: e.target.value })}>
          {accounts.map((a) => <option key={a.code} value={a.code}>{a.code} {a.name}</option>)}
        </select>
      </label>
      <label>Date<br /><input type="date" value={f.expense_date} onChange={(e) => setF({ ...f, expense_date: e.target.value })} /></label>
      <button className="btn-primary" type="submit">Record</button>
    </form>
  );
}
