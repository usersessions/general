const VARIANTS: Record<string, string> = {
  // ok: settled, positive, available
  paid: 'ok', approved: 'ok', received: 'ok', accepted: 'ok', delivered: 'ok',
  success: 'ok', in_stock: 'ok', offcut: 'ok', completed: 'ok', active: 'ok',
  // info: in motion (Marking Blue = reserved/in-progress per design system)
  reserved: 'info', issued: 'info', sent: 'info', open: 'info',
  in_progress: 'info', queued: 'info', processing: 'info',
  // warn: needs attention
  partially_paid: 'warn', pending: 'warn', pending_approval: 'warn',
  // danger
  failed: 'danger', rejected: 'danger', void: 'danger', cancelled: 'danger', abandoned: 'danger',
  // muted: inert
  draft: 'muted', consumed: 'muted', expired: 'muted', inactive: 'muted',
};

export default function StatusBadge({ status }: { status: string }) {
  const variant = VARIANTS[status] ?? 'muted';
  return <span className={`badge badge-${variant}`}>{status.replace(/_/g, ' ')}</span>;
}
