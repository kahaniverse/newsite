'use client';
import { useToastStore } from '@/store';

export function ToastContainer() {
  const { toasts, remove } = useToastStore();
  return (
    <div aria-live="polite" aria-atomic="false" className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999] flex flex-col gap-2 pointer-events-none">
      {toasts.map(t => (
        <div
          key={t.id}
          role="alert"
          className={`toast pointer-events-auto cursor-pointer ${t.type === 'error' ? 'border-error text-error' : ''}`}
          onClick={() => remove(t.id)}
        >
          {t.message}
        </div>
      ))}
    </div>
  );
}
