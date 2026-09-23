'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { SignInButton, SignUpButton, SignedIn, SignedOut, UserButton } from '@clerk/nextjs';
import { FiMenu, FiX } from 'react-icons/fi';
import ThemeToggle from '@/components/common/ThemeToggle';
import { hasUsableClerkKey } from '@/lib/clerk';

const NAV_LINKS = [
  { href: '#features', label: 'Features' },
  { href: '/about', label: 'About' },
  { href: '#faq', label: 'FAQ' },
  { href: 'https://github.com/Venkat-Kolasani/FutureStack', label: 'GitHub', external: true },
];

export default function LandingNav() {
  const router = useRouter();
  const clerkEnabled = hasUsableClerkKey();
  const [menuOpen, setMenuOpen] = useState(false);

  const closeMenu = () => setMenuOpen(false);

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
          {NAV_LINKS.map((link) => (
            link.external ? (
              <a
                key={link.label}
                href={link.href}
                target="_blank"
                rel="noreferrer"
                className="hover:text-black dark:hover:text-white transition-colors"
              >
                {link.label}
              </a>
            ) : link.href.startsWith('/') ? (
              <Link key={link.label} href={link.href} className="hover:text-black dark:hover:text-white transition-colors">
                {link.label}
              </Link>
            ) : (
              <a key={link.label} href={link.href} className="hover:text-black dark:hover:text-white transition-colors">
                {link.label}
              </a>
            )
          ))}
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
              className="hidden sm:inline-flex px-4 py-2 sm:px-5 sm:py-2.5 bg-gray-900 dark:bg-white text-white dark:text-black text-xs sm:text-sm font-semibold rounded-full hover:bg-gray-800 dark:hover:bg-gray-200 transition-all transform hover:scale-105 active:scale-95"
            >
              Get Started
            </Link>
          )}
          <button
            type="button"
            className="md:hidden p-2 rounded-lg text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/10"
            aria-expanded={menuOpen}
            aria-controls="landing-mobile-nav"
            onClick={() => setMenuOpen((open) => !open)}
          >
            {menuOpen ? <FiX size={22} aria-hidden="true" /> : <FiMenu size={22} aria-hidden="true" />}
            <span className="sr-only">{menuOpen ? 'Close menu' : 'Open menu'}</span>
          </button>
        </div>
      </div>

      {menuOpen ? (
        <div
          id="landing-mobile-nav"
          className="md:hidden border-t border-gray-200 dark:border-white/10 bg-white/95 dark:bg-black/90 px-6 py-4 flex flex-col gap-3 text-sm font-medium text-gray-700 dark:text-gray-200"
        >
          {NAV_LINKS.map((link) => (
            link.external ? (
              <a
                key={link.label}
                href={link.href}
                target="_blank"
                rel="noreferrer"
                className="py-2"
                onClick={closeMenu}
              >
                {link.label}
              </a>
            ) : link.href.startsWith('/') ? (
              <Link key={link.label} href={link.href} className="py-2" onClick={closeMenu}>
                {link.label}
              </Link>
            ) : (
              <a key={link.label} href={link.href} className="py-2" onClick={closeMenu}>
                {link.label}
              </a>
            )
          ))}
          {clerkEnabled ? (
            <SignedOut>
              <SignInButton mode="modal">
                <button type="button" className="py-2 text-left" onClick={closeMenu}>
                  Sign in
                </button>
              </SignInButton>
            </SignedOut>
          ) : (
            <Link href="/dashboard" className="py-2" onClick={closeMenu}>
              Sign in
            </Link>
          )}
        </div>
      ) : null}
    </nav>
  );
}
