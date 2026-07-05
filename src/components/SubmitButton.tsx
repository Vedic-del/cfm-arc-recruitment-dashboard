'use client';

import { useFormStatus } from 'react-dom';

const PRIMARY = 'rounded-lg bg-forest-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-forest-700 disabled:cursor-not-allowed disabled:opacity-60';
const SECONDARY = 'rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-forest-900 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60';

export function SubmitButton({
  children,
  pendingText,
  variant = 'primary',
  className,
}: {
  children: React.ReactNode;
  pendingText: string;
  variant?: 'primary' | 'secondary';
  className?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={className ?? (variant === 'primary' ? PRIMARY : SECONDARY)}>
      {pending ? pendingText : children}
    </button>
  );
}
