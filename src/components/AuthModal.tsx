'use client';

import { useState } from 'react';
import { Button } from './ui/Button';
import { getSupabaseBrowser } from '@/lib/supabase/browser';

interface AuthModalProps {
  onClose: () => void;
}

type ModalState = 'idle' | 'loading' | 'sent' | 'error';

export function AuthModal({ onClose }: AuthModalProps) {
  const [email, setEmail] = useState('');
  const [modalState, setModalState] = useState<ModalState>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [showEmailForm, setShowEmailForm] = useState(false);

  const handleGoogleSignIn = async () => {
    setModalState('loading');
    try {
      const supabase = getSupabaseBrowser();
      if (!supabase) throw new Error('Auth not configured.');

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: typeof window !== 'undefined' ? window.location.origin : undefined,
        },
      });
      if (error) throw error;
      // Page will redirect to Google — no further state needed
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Google sign-in failed. Please try again.');
      setModalState('error');
    }
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setModalState('loading');
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
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 flex flex-col gap-5">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Sign in to VoxPrompt</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Get 2 more free uses after signing in
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

        {/* Email-sent confirmation */}
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
                Click the link in the email to sign in.
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* Google button — primary */}
            <button
              onClick={handleGoogleSignIn}
              disabled={modalState === 'loading'}
              className="w-full flex items-center justify-center gap-3 border border-gray-300 rounded-lg px-4 py-2.5 text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 active:bg-gray-100 transition-colors disabled:opacity-60 disabled:cursor-not-allowed shadow-sm"
            >
              <GoogleIcon />
              Continue with Google
            </button>

            {/* Divider */}
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-gray-200" />
              <span className="text-xs text-gray-400">or</span>
              <div className="flex-1 h-px bg-gray-200" />
            </div>

            {/* Error banner */}
            {modalState === 'error' && (
              <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-center">
                {errorMsg}
              </p>
            )}

            {/* Email form — secondary */}
            {showEmailForm ? (
              <form onSubmit={handleEmailSubmit} className="flex flex-col gap-3">
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
                <Button
                  type="submit"
                  loading={modalState === 'loading'}
                  disabled={modalState === 'loading' || !email.trim()}
                  size="lg"
                >
                  Send magic link
                </Button>
              </form>
            ) : (
              <button
                onClick={() => setShowEmailForm(true)}
                className="text-sm text-center text-gray-500 hover:text-gray-700 transition-colors"
              >
                Continue with email instead
              </button>
            )}
          </>
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

function GoogleIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
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
