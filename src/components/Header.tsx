'use client';

import Image from 'next/image';
import type { User } from '@supabase/supabase-js';

interface HeaderProps {
  user?: User | null;
  usesLeft?: number | null;
  onSignIn?: () => void;
  onSignOut?: () => void;
}

export function Header({ user, usesLeft, onSignIn, onSignOut }: HeaderProps) {
  return (
    <header className="border-b border-gray-100 bg-white/80 backdrop-blur-sm sticky top-0 z-10">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
        {/* Logo + name */}
        <div className="flex items-center gap-2.5 shrink-0">
          <Image
            src="/logo.png"
            alt="VoxPrompt logo"
            width={32}
            height={32}
            className="rounded-lg"
            priority
          />
          <div>
            <span className="text-base font-bold text-gray-900 tracking-tight">VoxPrompt</span>
            <span className="hidden sm:inline ml-2 text-xs font-medium text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded-full">
              MVP · v1.10.0
            </span>
          </div>
        </div>

        {/* Tagline */}
        <p className="hidden md:block text-sm text-gray-500 flex-1 text-center">
          Voice → AI&nbsp;Prompt in seconds
        </p>

        {/* Auth area */}
        <div className="flex items-center gap-2 shrink-0">
          {user ? (
            <>
              <span className="hidden sm:block text-xs text-gray-500 truncate max-w-[140px]">
                {user.email}
              </span>
              {usesLeft !== null && usesLeft !== undefined && (
                <span
                  className={[
                    'px-2 py-0.5 rounded-full text-xs font-medium border',
                    usesLeft === 0
                      ? 'bg-red-50 text-red-600 border-red-100'
                      : usesLeft <= 3
                      ? 'bg-amber-50 text-amber-700 border-amber-100'
                      : 'bg-indigo-50 text-indigo-600 border-indigo-100',
                  ].join(' ')}
                >
                  {usesLeft} {usesLeft === 1 ? 'use' : 'uses'} left
                </span>
              )}
              <button
                onClick={onSignOut}
                className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
              >
                Sign out
              </button>
            </>
          ) : (
            <button
              onClick={onSignIn}
              className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-medium hover:bg-indigo-700 transition-colors"
            >
              Sign in / Sign up
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
