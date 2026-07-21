import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { NAV_ITEMS, type AppRole } from '@/lib/roles';

const SECTION_PHASES: Record<string, string> = {
  inventory: 'Phase 2: Product catalogue & stock-unit inventory',
  sales: 'Phase 3: Quotations & invoices',
  finance: 'Phase 5: Financial ledger & dashboards',
  hr: 'Phase 7: Attendance (QR kiosk)',
  procurement: 'Phase 8: Procurement workflow',
};

export default async function SectionPage({
  params,
}: {
  params: Promise<{ section: string }>;
}) {
  const { section } = await params;
  const item = NAV_ITEMS.find((i) => i.href === `/${section}`);
  if (!item || !SECTION_PHASES[section]) notFound();

  // Page-level gating is UX only; data access is enforced by RLS.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user!.id)
    .single();

  if (!profile || !item.roles.includes(profile.role as AppRole)) {
    redirect('/dashboard');
  }

  return (
    <>
      <h1>{item.label}</h1>
      <div className="card">
        <p>
          This module is scheduled for <strong>{SECTION_PHASES[section]}</strong>.
        </p>
        <p className="muted">
          You can see this section because your role grants access to it.
        </p>
      </div>
    </>
  );
}
