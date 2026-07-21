import { createClient } from '@/lib/supabase/server';
import ExpenseForm from './expense-form';

export default async function ExpensesPage() {
  const supabase = await createClient();
  const [{ data: expenses }, { data: departments }, { data: accounts }] = await Promise.all([
    supabase.from('expenses').select('*, department:departments(name)').order('expense_date', { ascending: false }).limit(50),
    supabase.from('departments').select('id, name').order('name'),
    supabase.from('chart_of_accounts').select('code, name').eq('type', 'expense').order('code'),
  ]);

  return (
    <>
      <h1>Expenses</h1>
      <div className="card">
        <h3>Record expense</h3>
        <ExpenseForm departments={departments ?? []} accounts={accounts ?? []} />
      </div>
      <div className="card">
        <table>
          <thead><tr><th>Date</th><th>Description</th><th>Department</th><th>Account</th><th>Amount</th></tr></thead>
          <tbody>
            {(expenses ?? []).map((e: any) => (
              <tr key={e.id}>
                <td>{e.expense_date}</td><td>{e.description}</td>
                <td>{e.department?.name ?? '-'}</td><td>{e.account_code}</td>
                <td>{Number(e.amount).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
