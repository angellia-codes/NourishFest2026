import { type ButtonHTMLAttributes, forwardRef } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

const VARIANT_CLASSES: Record<Variant, string> = {
  primary: 'bg-gradient-to-r from-guava to-coral text-white hover:brightness-105 shadow-sm',
  secondary: 'bg-jungle text-white hover:brightness-110',
  ghost: 'bg-transparent text-ink hover:bg-ink/5 border border-ink/10',
  danger: 'bg-transparent text-red-600 hover:bg-red-50 border border-red-200',
};

const SIZE_CLASSES: Record<Size, string> = {
  sm: 'text-xs px-2.5 py-1.5 rounded-md',
  md: 'text-sm px-4 py-2 rounded-lg',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', className = '', ...props }, ref) => (
    <button
      ref={ref}
      className={[
        'inline-flex items-center gap-1.5 font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed',
        VARIANT_CLASSES[variant],
        SIZE_CLASSES[size],
        className,
      ].join(' ')}
      {...props}
    />
  ),
);
Button.displayName = 'Button';
