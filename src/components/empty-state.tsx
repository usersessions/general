export default function EmptyState({ title, hint, action }: {
  title: string;
  hint?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="empty">
      <strong>{title}</strong>
      {hint && <span>{hint}</span>}
      {action && <div style={{ marginTop: '0.75rem' }}>{action}</div>}
    </div>
  );
}
