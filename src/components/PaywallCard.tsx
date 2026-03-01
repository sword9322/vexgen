'use client';

import { Button } from './ui/Button';

interface PaywallCardProps {
  /** PAYWALL = logged-in but quota exhausted; PAYWALL_ANON = anonymous quota exhausted */
  code: 'PAYWALL' | 'PAYWALL_ANON';
  isLoggedIn: boolean;
  onSignIn: () => void;
  onPay: () => void;
  isPayLoading?: boolean;
}

export function PaywallCard({ code, isLoggedIn, onSignIn, onPay, isPayLoading }: PaywallCardProps) {
  const showSignUp = code === 'PAYWALL_ANON' && !isLoggedIn;

  return (
    <div className="mt-3 rounded-xl border border-indigo-200 bg-gradient-to-br from-indigo-50 to-violet-50 p-5">
      <div className="flex flex-col items-center gap-3 text-center sm:flex-row sm:text-left sm:gap-4">
        {/* Icon */}
        <div className="w-10 h-10 rounded-full bg-indigo-100 border border-indigo-200 flex items-center justify-center shrink-0">
          <LockIcon />
        </div>

        {/* Text */}
        <div className="flex-1">
          <p className="font-semibold text-gray-900 text-sm">
            You&apos;ve used all your free generations
          </p>
          <p className="text-xs text-gray-500 mt-0.5">
            {showSignUp
              ? 'Create a free account for 2 more uses, or buy 15 generations for $5.'
              : 'Buy 15 more generations for $5 — no subscription, pay again when you run out.'}
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 shrink-0">
          {showSignUp && (
            <Button onClick={onSignIn} variant="secondary" size="sm">
              Create account
            </Button>
          )}
          <Button onClick={onPay} size="sm" loading={isPayLoading}>
            $5 — 15 generations
          </Button>
        </div>
      </div>
    </div>
  );
}

function LockIcon() {
  return (
    <svg className="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M7 11V7a5 5 0 0110 0v4" />
    </svg>
  );
}
