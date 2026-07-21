'use client';

import { useMemo, useState } from 'react';

export function useSort<T extends Record<string, any>>(rows: T[], initialKey: string, initialDesc = false) {
  const [key, setKey] = useState(initialKey);
  const [desc, setDesc] = useState(initialDesc);

  const sorted = useMemo(() => {
    const copy = [...rows];
    copy.sort((a, b) => {
      const av = a[key]; const bv = b[key];
      if (av == null) return 1;
      if (bv == null) return -1;
      const cmp = typeof av === 'number' && typeof bv === 'number'
        ? av - bv
        : String(av).localeCompare(String(bv), undefined, { numeric: true });
      return desc ? -cmp : cmp;
    });
    return copy;
  }, [rows, key, desc]);

  function toggle(nextKey: string) {
    if (nextKey === key) setDesc(!desc);
    else { setKey(nextKey); setDesc(false); }
  }

  const arrow = (k: string) => (k === key ? (desc ? '\u25be' : '\u25b4') : '');
  return { sorted, toggle, arrow };
}
