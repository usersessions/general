'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { APP_ROLES } from '@/lib/roles';

type ProfileRow = {
  id: string;
  email: string;
  full_name: string;
  role: string;
  is_active: boolean;
  department_id: string | null;
};

type Department = { id: string; name: string };

export default function UsersTable({
  profiles,
  departments,
}: {
  profiles: ProfileRow[];
  departments: Department[];
}) {
  const [rows, setRows] = useState(profiles);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  async function updateRow(id: string, patch: Partial<ProfileRow>) {
    setError(null);
    const { error } = await supabase.from('profiles').update(patch).eq('id', id);
    if (error) {
      setError(error.message);
      return;
    }
    setRows((r) => r.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  }

  return (
    <div className="card">
      {error && <p className="error">{error}</p>}
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Role</th>
            <th>Department</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <td>{row.full_name || '-'}</td>
              <td>{row.email}</td>
              <td>
                <select
                  value={row.role}
                  onChange={(e) => updateRow(row.id, { role: e.target.value })}
                >
                  {APP_ROLES.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </td>
              <td>
                <select
                  value={row.department_id ?? ''}
                  onChange={(e) =>
                    updateRow(row.id, { department_id: e.target.value || null })
                  }
                >
                  <option value="">Unassigned</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </td>
              <td>
                <button
                  className={row.is_active ? 'btn-secondary' : 'btn-primary'}
                  onClick={() => updateRow(row.id, { is_active: !row.is_active })}
                >
                  {row.is_active ? 'Deactivate' : 'Activate'}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
