import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';

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
      <h1>HR &amp; Attendance</h1>
      <p>
        <Link href="/hr/badges">Employee badges</Link>
        {' · '}
        <Link href="/hr/kiosks">Kiosk devices</Link>
      </p>
      <div className="card">
        <h3>Attendance (last 7 days)</h3>
        <table>
          <thead><tr><th>Time</th><th>Employee</th><th>Direction</th><th>Kiosk</th></tr></thead>
          <tbody>
            {(scans ?? []).map((s: any) => (
              <tr key={s.id}>
                <td>{s.scanned_at.slice(0, 16).replace('T', ' ')}</td>
                <td>{s.employee?.full_name || s.employee?.email}</td>
                <td>{s.direction.toUpperCase()}</td>
                <td>{s.kiosk?.name ?? '-'}</td>
              </tr>
            ))}
            {(scans ?? []).length === 0 && <tr><td colSpan={4} className="muted">No scans yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}
