import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import UsersTable from './users-table';

export default async function AdminUsersPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: me } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user!.id)
    .single();

  if (!me || !['admin', 'super_admin'].includes(me.role)) {
    redirect('/dashboard');
  }

  const [{ data: profiles }, { data: departments }] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, email, full_name, role, is_active, department_id')
      .order('created_at'),
    supabase.from('departments').select('id, name').order('name'),
  ]);

  return (
    <>
      <h1>Users</h1>
      <p className="muted">
        Activate accounts and assign roles and departments. All changes are enforced
        by Row Level Security in Postgres.
      </p>
      <UsersTable profiles={profiles ?? []} departments={departments ?? []} />
    </>
  );
}
