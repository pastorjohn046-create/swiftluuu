import React from 'react';
import { cn } from '@/src/lib/utils';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'flat' | 'outline';
}

export const Card: React.FC<CardProps> = ({ 
  className, 
  variant = 'default', 
  children, 
  ...props 
}) => {
  const variants = {
    default: 'bg-white shadow-sm border border-zinc-100 dark:bg-zinc-900 dark:border-zinc-800',
    flat: 'bg-zinc-50 dark:bg-zinc-800',
    outline: 'border border-zinc-200 dark:border-zinc-800',
  };

  return (
    <div
      className={cn('rounded-3xl p-6', variants[variant], className)}
      {...props}
    >
      {children}
    </div>
  );
};
