'use client';

import { useState } from 'react';
import { Button } from './ui/Button';
import { getSupabaseBrowser } from '@/lib/supabase/browser';

interface AuthModalProps {
  onClose: () => void;
}

type ModalState = 'idle' | 'submitting' | 'sent' | 'error';

export function AuthModal({ onClose }: AuthModalProps) {
  const [email, setEmail] = useState('');
  const [modalState, setModalState] = useState<ModalState>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setModalState('submitting');
    try {
      const supabase = getSupabaseBrowser();
      if (!supabase) throw new Error('Auth not configured.');

      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          emailRedirectTo: typeof window !== 'undefined' ? window.location.origin : undefined,
        },
      });
      if (error) throw error;
      setModalState('sent');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
      setModalState('error');
    }
  };

  return (
    // Backdrop
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 flex flex-col gap-5">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Create your account</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              We&apos;ll send you a magic sign-in link — no password needed.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors -mt-0.5"
            aria-label="Close"
          >
            <CloseIcon />
          </button>
        </div>

        {/* Sent state */}
        {modalState === 'sent' ? (
          <div className="flex flex-col items-center gap-3 py-4 text-center">
            <div className="w-12 h-12 rounded-full bg-emerald-50 border-2 border-emerald-100 flex items-center justify-center">
              <MailIcon />
            </div>
            <div>
              <p className="font-semibold text-gray-900">Check your email</p>
              <p className="text-sm text-gray-500 mt-1">
                We sent a sign-in link to <strong>{email}</strong>.
              </p>
              <p className="text-xs text-gray-400 mt-1">
                After signing in, you&apos;ll get 2 more free generations.
              </p>
            </div>
          </div>
        ) : (
          /* Form state */
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="auth-email" className="text-xs font-medium text-gray-700">
                Email address
              </label>
              <input
                id="auth-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                autoFocus
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
              />
            </div>

            {modalState === 'error' && (
              <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                {errorMsg}
              </p>
            )}

            <Button
              type="submit"
              loading={modalState === 'submitting'}
              disabled={modalState === 'submitting' || !email.trim()}
              size="lg"
            >
              Send magic link
            </Button>

            <p className="text-center text-xs text-gray-400">
              Already have an account? Use the same email — we&apos;ll sign you in.
            </p>
          </form>
        )}
      </div>
    </div>
  );
}

function CloseIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function MailIcon() {
  return (
    <svg className="w-6 h-6 text-emerald-500" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  );
}
