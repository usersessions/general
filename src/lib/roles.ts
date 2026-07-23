export const APP_ROLES = [
  'super_admin',
  'admin',
  'hr',
  'finance',
  'procurement',
  'sales',
  'workshop',
] as const;

export type AppRole = (typeof APP_ROLES)[number];

export interface NavItem {
  label: string;
  href: string;
  roles: readonly AppRole[];
}

const ALL_ROLES: readonly AppRole[] = APP_ROLES;

// Navigation visibility is UX only. Real enforcement is Postgres RLS.
export const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', roles: ALL_ROLES },
  { label: 'My Activities', href: '/activities', roles: ALL_ROLES },
  {
    label: 'Inventory',
    href: '/inventory',
    roles: ['super_admin', 'admin', 'procurement', 'workshop', 'sales'],
  },
  {
    label: 'Sales',
    href: '/sales',
    roles: ['super_admin', 'admin', 'sales', 'finance'],
  },
  {
    label: 'Procurement',
    href: '/procurement',
    roles: ['super_admin', 'admin', 'procurement', 'finance'],
  },
  {
    label: 'Finance',
    href: '/finance',
    roles: ['super_admin', 'admin', 'finance'],
  },
  {
    label: 'HR & Attendance',
    href: '/hr',
    roles: ['super_admin', 'admin', 'hr'],
  },
  {
    label: 'Admin',
    href: '/admin',
    roles: ['super_admin', 'admin'],
  },
];

export function navForRole(role: AppRole): NavItem[] {
  return NAV_ITEMS.filter((item) => item.roles.includes(role));
}
