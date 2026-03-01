'use client';

import Image from 'next/image';

export function Header() {
  return (
    <header className="border-b border-gray-100 bg-white/80 backdrop-blur-sm sticky top-0 z-10">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
        {/* Logo + name */}
        <div className="flex items-center gap-2.5">
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
              MVP · v0.1.0
            </span>
          </div>
        </div>

        {/* Tagline */}
        <p className="hidden md:block text-sm text-gray-500">
          Voice → AI&nbsp;Prompt in seconds
        </p>

        {/* Links */}
        <nav className="flex items-center gap-3">
          <a
            href="https://platform.openai.com/docs/guides/speech-to-text"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:inline text-xs text-gray-500 hover:text-gray-800 transition-colors"
          >
            Powered by Whisper
          </a>
        </nav>
      </div>
    </header>
  );
}
