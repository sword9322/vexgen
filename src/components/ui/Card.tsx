'use client';

import { HTMLAttributes } from 'react';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /** Adds a subtle coloured left border */
  accent?: 'indigo' | 'green' | 'amber' | 'red';
  /** Adds padding. Default: true */
  padded?: boolean;
}

const ACCENT_CLASSES = {
  indigo: 'border-l-4 border-l-indigo-500',
  green: 'border-l-4 border-l-emerald-500',
  amber: 'border-l-4 border-l-amber-500',
  red: 'border-l-4 border-l-red-500',
};

export function Card({ accent, padded = true, className = '', children, ...props }: CardProps) {
  return (
    <div
      className={[
        'bg-white rounded-xl border border-gray-200 shadow-sm',
        padded ? 'p-5' : '',
        accent ? ACCENT_CLASSES[accent] : '',
        className,
      ].join(' ')}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ className = '', children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={['flex items-center gap-2 mb-4', className].join(' ')} {...props}>
      {children}
    </div>
  );
}

export function CardTitle({ className = '', children, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3 className={['text-base font-semibold text-gray-900', className].join(' ')} {...props}>
      {children}
    </h3>
  );
}
