import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';

const kes = (n: number) => 'KES ' + Number(n).toLocaleString('en-KE', { maximumFractionDigits: 0 });

export default async function FinancePage() {
  const supabase = await createClient();
  const [{ data: balances }, { data: receivables }, { data: jobs }] = await Promise.all([
    supabase.from('v_account_balances').select('*'),
    supabase.from('v_receivables').select('*').order('due_date'),
    supabase.from('v_job_profitability').select('*').order('order_number', { ascending: false }).limit(25),
  ]);

  const bal = (code: string) => Number((balances ?? []).find((b: any) => b.code === code)?.balance ?? 0);
  const cash = bal('1000') + bal('1010') + bal('1020');
  const arTotal = (receivables ?? []).reduce((s: number, r: any) => s + Number(r.balance), 0);
  const vat = -bal('2100'); // liability: credit balance shown positive
  const payables = -bal('2000');

  return (
    <>
      <h1>Finance</h1>
      <p><Link href="/finance/expenses">Expenses</Link></p>
      <div className="cards">
        <div className="card"><h3>Cash position</h3><p>{kes(cash)}</p></div>
        <div className="card"><h3>Receivables</h3><p>{kes(arTotal)}</p></div>
        <div className="card"><h3>Payables</h3><p>{kes(payables)}</p></div>
        <div className="card"><h3>VAT payable</h3><p>{kes(vat)}</p></div>
      </div>

      <div className="card">
        <h3>Outstanding invoices</h3>
        <table>
          <thead><tr><th>Invoice</th><th>Client</th><th>Due</th><th>Total</th><th>Balance</th></tr></thead>
          <tbody>
            {(receivables ?? []).map((r: any) => (
              <tr key={r.id}>
                <td><Link href={`/sales/invoices/${r.id}`}>{r.invoice_number}</Link></td>
                <td>{r.client_name}</td><td>{r.due_date ?? '-'}</td>
                <td>{kes(r.total)}</td><td>{kes(r.balance)}</td>
              </tr>
            ))}
            {(receivables ?? []).length === 0 && <tr><td colSpan={5} className="muted">Nothing outstanding.</td></tr>}
          </tbody>
        </table>
      </div>

      <div className="card">
        <h3>Job profitability</h3>
        <table>
          <thead><tr><th>Order</th><th>Client</th><th>Status</th><th>Revenue</th><th>Materials</th><th>Profit</th></tr></thead>
          <tbody>
            {(jobs ?? []).map((j: any) => (
              <tr key={j.id}>
                <td><Link href={`/sales/orders/${j.id}`}>{j.order_number}</Link></td>
                <td>{j.client_name}</td><td>{j.status}</td>
                <td>{kes(j.revenue)}</td><td>{kes(j.material_cost)}</td>
                <td>{kes(Number(j.revenue) - Number(j.material_cost) - Number(j.labor_cost))}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="muted">Labor allocation not yet tracked; profit = revenue minus consumed materials at batch cost.</p>
      </div>

      <div className="card">
        <h3>Account balances</h3>
        <table>
          <thead><tr><th>Code</th><th>Account</th><th>Type</th><th>Balance</th></tr></thead>
          <tbody>
            {(balances ?? []).map((b: any) => (
              <tr key={b.id}><td>{b.code}</td><td>{b.name}</td><td>{b.type}</td><td>{kes(b.balance)}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
