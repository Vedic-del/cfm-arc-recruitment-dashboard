'use client';

import { SubmitButton } from './SubmitButton';

const DANGER =
  'rounded-lg border border-danger/30 bg-danger-bg px-4 py-2.5 text-sm font-semibold text-danger transition-colors hover:bg-danger/10 disabled:cursor-not-allowed disabled:opacity-60';

export function ConfirmDeleteForm({
  action,
  confirmMessage,
  buttonLabel = 'Delete',
  pendingText = 'Deleting…',
}: {
  action: (formData: FormData) => void | Promise<void>;
  confirmMessage: string;
  buttonLabel?: string;
  pendingText?: string;
}) {
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!confirm(confirmMessage)) e.preventDefault();
      }}
    >
      <SubmitButton pendingText={pendingText} className={DANGER}>
        {buttonLabel}
      </SubmitButton>
    </form>
  );
}
