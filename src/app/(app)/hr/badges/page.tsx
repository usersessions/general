import { createClient } from '@/lib/supabase/server';
import BadgesManager from './badges-manager';

export default async function BadgesPage() {
  const supabase = await createClient();
  const [{ data: profiles }, { data: badges }] = await Promise.all([
    supabase.from('profiles').select('id, full_name, email').eq('is_active', true).order('full_name'),
    supabase.from('employee_badges').select('*').eq('active', true),
  ]);
  return (
    <>
      <h1>Employee badges</h1>
      <p className="muted">Print the QR code and attach it to the employee&apos;s badge. Revoking issues a new code.</p>
      <BadgesManager profiles={profiles ?? []} badges={badges ?? []} />
    </>
  );
}
