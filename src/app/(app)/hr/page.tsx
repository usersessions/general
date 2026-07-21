import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import EmptyState from '@/components/empty-state';

export default async function HrPage() {
  const supabase = await createClient();
  const since = new Date(); since.setDate(since.getDate() - 7);
  const { data: scans } = await supabase
    .from('attendance')
    .select('id, scanned_at, direction, employee:profiles(full_name, email), kiosk:kiosk_devices(name)')
    .gte('scanned_at', since.toISOString())
    .order('scanned_at', { ascending: false })
    .limit(100);

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h1>HR &amp; Attendance</h1>
          <p className="muted">Clock events from the workshop kiosk, last 7 days.</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <Link className="btn-secondary" style={{ textDecoration: 'none' }} href="/hr/kiosks">Kiosk devices</Link>
          <Link className="btn-primary" style={{ textDecoration: 'none' }} href="/hr/badges">Employee badges</Link>
        </div>
      </div>
      <div className="card">
        {(scans ?? []).length === 0 ? (
          <EmptyState title="No scans yet" hint="Issue badges and set up a kiosk device; clock events will appear here." />
        ) : (
          <div className="table-scroll">
            <table>
              <thead><tr><th className="num">Time</th><th>Employee</th><th>Direction</th><th>Kiosk</th></tr></thead>
              <tbody>
                {(scans ?? []).map((s: any) => (
                  <tr key={s.id}>
                    <td className="num">{s.scanned_at.slice(0, 16).replace('T', ' ')}</td>
                    <td>{s.employee?.full_name || s.employee?.email}</td>
                    <td>
                      <span className={`badge ${s.direction === 'in' ? 'badge-ok' : 'badge-muted'}`}>
                        {s.direction === 'in' ? '\u2713 in' : '\u2192 out'}
                      </span>
                    </td>
                    <td className="muted">{s.kiosk?.name ?? '\u2014'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
