import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { navForRole, type AppRole } from '@/lib/roles';
import SideNav from '@/components/side-nav';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, role, is_active')
    .eq('id', user.id)
    .single();

  if (!profile || !profile.is_active) {
    return (
      <main className="pending">
        <h1>Account pending activation</h1>
        <p className="muted">
          Your account has been created but not yet activated by an administrator.
          Please contact management.
        </p>
        <form action="/auth/signout" method="post">
          <button className="btn-secondary" type="submit">
            Sign out
          </button>
        </form>
      </main>
    );
  }

  const nav = navForRole(profile.role as AppRole);

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          I&amp;S General Supplies
          <small>Aluminium · Glass · Mombasa</small>
        </div>
        <SideNav items={nav.map(({ label, href }) => ({ label, href }))} />
        <div className="sidebar-footer">
          <div className="user-name">{profile.full_name || user.email}</div>
          <div className="user-role">{profile.role.replace('_', ' ')}</div>
          <form action="/auth/signout" method="post">
            <button className="link-button" type="submit">
              Sign out
            </button>
          </form>
        </div>
      </aside>
      <main className="content">{children}</main>
    </div>
  );
}
