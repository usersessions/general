'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function SideNav({ items }: { items: { label: string; href: string }[] }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Main">
      {items.map((item) => {
        const active = pathname === item.href || pathname.startsWith(item.href + '/');
        return (
          <Link key={item.href} href={item.href} className={active ? 'active' : ''} aria-current={active ? 'page' : undefined}>
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
