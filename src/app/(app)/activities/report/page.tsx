import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import PrintButton from './print-button';
import './report.css';

export default async function ReportPage({
  searchParams
}: {
  searchParams: Promise<{ month?: string; staff?: string }>
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const resolvedSearchParams = await searchParams;
  const monthParam = resolvedSearchParams.month; // e.g. "2026-07"
  const staffId = resolvedSearchParams.staff;

  if (!monthParam || !staffId) {
    return <div>Invalid parameters.</div>;
  }

  // Fetch the staff profile
  const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', staffId).single();
  
  const [yearStr, monthStr] = monthParam.split('-');
  const year = parseInt(yearStr);
  const monthIdx = parseInt(monthStr) - 1;
  const startDate = new Date(year, monthIdx, 1).toISOString().split('T')[0];
  const endDate = new Date(year, monthIdx + 1, 0).toISOString().split('T')[0];
  const displayMonth = new Date(year, monthIdx, 1).toLocaleString('default', { month: 'long', year: 'numeric' });

  // Fetch activities
  const { data: activities } = await supabase
    .from('staff_activities')
    .select('*')
    .eq('profile_id', staffId)
    .gte('scheduled_date', startDate)
    .lte('scheduled_date', endDate)
    .order('scheduled_date');

  const acts = activities || [];
  const completed = acts.filter(a => a.status === 'completed');
  const pending = acts.filter(a => a.status === 'pending');

  const fmtDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('default', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  return (
    <div className="report-page">
      <div className="report-header">
        <div className="report-title">
          <h1>Staff Activity Report</h1>
          <p>{profile?.full_name || 'Unknown Staff'}</p>
        </div>
        <div className="report-meta">
          <div><strong>Month:</strong> {displayMonth}</div>
          <div><strong>Generated:</strong> {new Date().toLocaleDateString()}</div>
        </div>
      </div>

      <div className="no-print" style={{marginBottom: 24}}>
        <PrintButton />
      </div>

      <h2 className="section-title">Completed Activities & Outcomes</h2>
      {completed.length === 0 ? (
        <div className="empty-state">No completed activities for this period.</div>
      ) : (
        <table className="report-table">
          <thead>
            <tr>
              <th className="col-date">Date</th>
              <th className="col-task">Activity</th>
              <th className="col-outcome">Outcome Report</th>
            </tr>
          </thead>
          <tbody>
            {completed.map(act => (
              <tr key={act.id}>
                <td className="col-date">{fmtDate(act.scheduled_date)}</td>
                <td className="col-task">
                  {act.title}
                  {act.description && <div style={{fontSize: 12, color: '#6B7280', marginTop: 4, fontWeight: 'normal'}}>{act.description}</div>}
                </td>
                <td className="col-outcome">{act.outcome_report || <span style={{fontStyle: 'italic', color: '#9CA3AF'}}>No report provided</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {pending.length > 0 && (
        <>
          <h2 className="section-title">Pending Tasks (Missed/Incomplete)</h2>
          <table className="report-table">
            <thead>
              <tr>
                <th className="col-date">Date</th>
                <th className="col-task">Activity</th>
                <th className="col-outcome">Description</th>
              </tr>
            </thead>
            <tbody>
              {pending.map(act => (
                <tr key={act.id}>
                  <td className="col-date">{fmtDate(act.scheduled_date)}</td>
                  <td className="col-task">{act.title}</td>
                  <td className="col-outcome">{act.description || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      <div className="signature-block">
        <div className="sig-line">
          <div className="line"></div>
          <div className="label">Staff Signature: {profile?.full_name}</div>
        </div>
        <div className="sig-line">
          <div className="line"></div>
          <div className="label">Manager / Supervisor Signature</div>
        </div>
      </div>
    </div>
  );
}
