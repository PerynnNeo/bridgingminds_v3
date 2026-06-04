import * as React from 'react';
import { cn } from '@/lib/utils';

const fieldClasses =
  'h-12 w-full rounded-xl border border-primary-100 bg-white px-4 text-base text-charcoal outline-none placeholder:text-charcoal/40 focus:border-primary-400 focus:ring-2 focus:ring-primary-200 disabled:opacity-50';

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input ref={ref} className={cn(fieldClasses, className)} {...props} />
  ),
);
Input.displayName = 'Input';

export const Select = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(({ className, ...props }, ref) => (
  <select ref={ref} className={cn(fieldClasses, 'appearance-none', className)} {...props} />
));
Select.displayName = 'Select';

export function Label({ className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label className={cn('mb-1.5 block text-sm font-medium text-charcoal/80', className)} {...props} />
  );
}
