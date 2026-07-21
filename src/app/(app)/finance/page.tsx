import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import AgingChart from '@/components/aging-chart';
import StatusBadge from '@/components/status-badge';
import EmptyState from '@/components/empty-state';

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
  const vat = -bal('2100');
  const payables = -bal('2000');

  // Aging buckets by days overdue
  const today = new Date();
  const buckets = [
    { label: 'Not yet due', value: 0 },
    { label: '1\u201330 days', value: 0 },
    { label: '31\u201360 days', value: 0 },
    { label: '60+ days', value: 0 },
  ];
  for (const r of receivables ?? []) {
    const overdue = r.due_date ? Math.floor((today.getTime() - new Date(r.due_date).getTime()) / 86400000) : 0;
    const i = overdue <= 0 ? 0 : overdue <= 30 ? 1 : overdue <= 60 ? 2 : 3;
    buckets[i].value += Number(r.balance);
  }

  return (
    <>
      <h1>Finance</h1>
      <p className="muted">Cash, receivables and job margins at a glance. <Link href="/finance/expenses">Record expenses</Link></p>

      <div className="kpi-grid">
        <div className="kpi"><div className="kpi-label">Cash position</div><div className="kpi-value">{kes(cash)}</div><div className="kpi-sub">Cash + M-Pesa + bank</div></div>
        <div className="kpi"><div className="kpi-label">Receivables</div><div className="kpi-value">{kes(arTotal)}</div><div className="kpi-sub">{(receivables ?? []).length} open invoices</div></div>
        <div className="kpi"><div className="kpi-label">Payables</div><div className="kpi-value">{kes(payables)}</div><div className="kpi-sub">Owed to suppliers</div></div>
        <div className="kpi"><div className="kpi-label">VAT payable</div><div className="kpi-value">{kes(vat)}</div><div className="kpi-sub">Output less input VAT</div></div>
      </div>

      <div className="card">
        <h3>Receivables aging</h3>
        {arTotal > 0 ? (
          <AgingChart buckets={buckets} />
        ) : (
          <EmptyState title="Nothing outstanding" hint="Issued invoices appear here until they are paid." />
        )}
      </div>

      <div className="card">
        <h3>Outstanding invoices</h3>
        {(receivables ?? []).length === 0 ? (
          <EmptyState title="No open invoices" hint="Issue an invoice from a sales order to start tracking it here." />
        ) : (
          <div className="table-scroll">
            <table>
              <thead>
                <tr><th>Invoice</th><th>Client</th><th>Status</th><th>Due</th><th className="num">Total</th><th className="num">Balance</th></tr>
              </thead>
              <tbody>
                {(receivables ?? []).map((r: any) => (
                  <tr key={r.id}>
                    <td className="mono"><Link href={`/sales/invoices/${r.id}`}>{r.invoice_number}</Link></td>
                    <td>{r.client_name}</td>
                    <td><StatusBadge status={r.status} /></td>
                    <td className="mono">{r.due_date ?? '\u2014'}</td>
                    <td className="num">{Number(r.total).toLocaleString()}</td>
                    <td className="num">{Number(r.balance).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="card">
        <h3>Job profitability</h3>
        {(jobs ?? []).length === 0 ? (
          <EmptyState title="No jobs yet" hint="Accept a quotation to create a sales order; margins appear as material is consumed." />
        ) : (
          <div className="table-scroll">
            <table>
              <thead>
                <tr><th>Order</th><th>Client</th><th>Status</th><th className="num">Revenue</th><th className="num">Materials</th><th className="num">Profit</th></tr>
              </thead>
              <tbody>
                {(jobs ?? []).map((j: any) => {
                  const profit = Number(j.revenue) - Number(j.material_cost) - Number(j.labor_cost);
                  return (
                    <tr key={j.id}>
                      <td className="mono"><Link href={`/sales/orders/${j.id}`}>{j.order_number}</Link></td>
                      <td>{j.client_name}</td>
                      <td><StatusBadge status={j.status} /></td>
                      <td className="num">{Number(j.revenue).toLocaleString()}</td>
                      <td className="num">{Number(j.material_cost).toLocaleString()}</td>
                      <td className="num" style={{ color: profit < 0 ? 'var(--score)' : 'var(--glass-dark)', fontWeight: 600 }}>
                        {profit.toLocaleString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <p className="muted" style={{ fontSize: '0.75rem' }}>Labor allocation not yet tracked; profit = revenue minus consumed materials at batch cost.</p>
      </div>

      <div className="card">
        <h3>Account balances</h3>
        <div className="table-scroll">
          <table>
            <thead><tr><th>Code</th><th>Account</th><th>Type</th><th className="num">Balance</th></tr></thead>
            <tbody>
              {(balances ?? []).map((b: any) => (
                <tr key={b.id}>
                  <td className="mono">{b.code}</td>
                  <td>{b.name}</td>
                  <td className="muted">{b.type}</td>
                  <td className="num">{Number(b.balance).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
