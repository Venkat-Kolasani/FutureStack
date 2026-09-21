'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { SignInButton, SignUpButton, SignedIn, SignedOut, UserButton } from '@clerk/nextjs';
import ThemeToggle from '@/components/common/ThemeToggle';
import { hasUsableClerkKey } from '@/lib/clerk';

export default function LandingNav() {
  const router = useRouter();
  const clerkEnabled = hasUsableClerkKey();

  return (
    <nav className="fixed top-0 w-full z-50 border-b border-gray-200 dark:border-white/10 bg-white/70 dark:bg-black/50 backdrop-blur-md transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gray-900 dark:bg-white rounded-lg flex items-center justify-center">
            <span className="font-bold text-white dark:text-gray-900 text-xl">F</span>
          </div>
          <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-400">
            FutureTracker
          </span>
        </div>

        <div className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-600 dark:text-gray-400">
          <a href="#features" className="hover:text-black dark:hover:text-white transition-colors">Features</a>
          <Link href="/about" className="hover:text-black dark:hover:text-white transition-colors">About</Link>
          <a href="#faq" className="hover:text-black dark:hover:text-white transition-colors">FAQ</a>
          <a href="https://github.com/Venkat-Kolasani/FutureStack" target="_blank" rel="noreferrer" className="hover:text-black dark:hover:text-white transition-colors">GitHub</a>
        </div>

        <div className="flex items-center gap-2 md:gap-4">
          <ThemeToggle />
          {clerkEnabled ? (
            <>
              <SignedOut>
                <SignInButton mode="modal">
                  <button className="hidden sm:block px-4 py-2 text-sm font-medium text-gray-600 hover:text-black dark:text-gray-300 dark:hover:text-white transition-colors">
                    Sign In
                  </button>
                </SignInButton>
                <SignUpButton mode="modal">
                  <button className="px-4 py-2 sm:px-5 sm:py-2.5 bg-gray-900 dark:bg-white text-white dark:text-black text-xs sm:text-sm font-semibold rounded-full hover:bg-gray-800 dark:hover:bg-gray-200 transition-all transform hover:scale-105 active:scale-95">
                    Get Started
                  </button>
                </SignUpButton>
              </SignedOut>
              <SignedIn>
                <button
                  onClick={() => router.push('/dashboard')}
                  className="px-4 py-2 sm:px-5 sm:py-2.5 bg-gray-900 dark:bg-white text-white dark:text-black text-xs sm:text-sm font-semibold rounded-full hover:bg-gray-800 dark:hover:bg-gray-200 transition-all transform hover:scale-105 active:scale-95"
                >
                  Launch App
                </button>
                <UserButton afterSignOutUrl="/" />
              </SignedIn>
            </>
          ) : (
            <Link
              href="/dashboard"
              className="px-4 py-2 sm:px-5 sm:py-2.5 bg-gray-900 dark:bg-white text-white dark:text-black text-xs sm:text-sm font-semibold rounded-full hover:bg-gray-800 dark:hover:bg-gray-200 transition-all transform hover:scale-105 active:scale-95"
            >
              Get Started
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
