import React from 'react';
import { cn } from '@/src/lib/utils';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, ...props }, ref) => {
    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300 ml-1">
            {label}
          </label>
        )}
        <input
          ref={ref}
          className={cn(
            'flex h-12 w-full rounded-xl border border-zinc-200 bg-white px-4 py-2 text-base transition-all placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-black disabled:cursor-not-allowed disabled:opacity-50 dark:bg-zinc-900 dark:border-zinc-800 dark:text-white dark:focus:ring-white/5 dark:focus:border-white',
            error && 'border-red-500 focus:ring-red-500/5 focus:border-red-500 dark:border-red-500 dark:focus:ring-red-500/5',
            className
          )}
          {...props}
        />
        {error && <p className="text-xs text-red-500 ml-1">{error}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';
