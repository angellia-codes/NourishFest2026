import { type ReactNode, type InputHTMLAttributes, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import { X } from 'lucide-react';

const fieldBase =
  'w-full rounded-lg border border-ink/15 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-guava/40 focus:border-guava/50 transition';

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={[fieldBase, props.className].filter(Boolean).join(' ')} />;
}

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={[fieldBase, 'min-h-[80px]', props.className].filter(Boolean).join(' ')} />;
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={[fieldBase, props.className].filter(Boolean).join(' ')} />;
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className="text-xs font-medium text-ink/60">{label}</span>
      {children}
    </label>
  );
}

const BADGE_COLORS: Record<string, string> = {
  neutral: 'bg-ink/8 text-ink/70',
  success: 'bg-jungle/10 text-jungle',
  warning: 'bg-sun/25 text-amber-800',
  danger: 'bg-red-100 text-red-700',
  info: 'bg-mango/20 text-amber-800',
  brand: 'bg-guava/10 text-guava',
};

export function Badge({ children, tone = 'neutral' }: { children: ReactNode; tone?: keyof typeof BADGE_COLORS }) {
  return (
    <span className={['inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium', BADGE_COLORS[tone]].join(' ')}>
      {children}
    </span>
  );
}

export function Modal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  if (!open) return null;
  return (
    // py-4 on phones: py-10 would burn a fifth of a short screen on margin.
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-ink/40 backdrop-blur-sm px-3 sm:px-4 py-4 sm:py-10 overflow-y-auto">
      <div className="w-full max-w-lg rounded-xl bg-paper shadow-xl border border-ink/10">
        <div className="flex items-center justify-between gap-3 px-4 sm:px-5 py-4 border-b border-ink/10">
          <h3 className="font-display text-lg font-semibold min-w-0 truncate">{title}</h3>
          <button onClick={onClose} className="text-ink/50 hover:text-ink shrink-0">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="px-4 sm:px-5 py-4">{children}</div>
      </div>
    </div>
  );
}
