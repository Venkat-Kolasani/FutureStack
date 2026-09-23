'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FiArrowRight } from 'react-icons/fi';
import { SignInButton, SignUpButton, SignedIn, SignedOut } from '@clerk/nextjs';
import { hasUsableClerkKey } from '@/lib/clerk';

const heroCtaClass =
  'px-8 py-4 bg-gray-900 hover:bg-black dark:bg-white dark:hover:bg-gray-100 text-white dark:text-black rounded-xl font-semibold text-lg transition-all flex items-center justify-center gap-2 group shadow-[0_0_20px_rgba(0,0,0,0.1)] dark:shadow-[0_0_20px_rgba(255,255,255,0.3)] hover:shadow-[0_0_30px_rgba(0,0,0,0.2)] dark:hover:shadow-[0_0_30px_rgba(255,255,255,0.5)]';

export default function LandingCtas() {
  const router = useRouter();
  const clerkEnabled = hasUsableClerkKey();

  if (!clerkEnabled) {
    return (
      <div className="flex items-center justify-center gap-4">
        <Link href="/dashboard" className={heroCtaClass}>
          Get Started Free
          <FiArrowRight className="group-hover:translate-x-1 transition-transform" />
        </Link>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center gap-4">
      <SignedOut>
        <SignUpButton mode="modal">
          <button className={heroCtaClass}>
            Get Started Free
            <FiArrowRight className="group-hover:translate-x-1 transition-transform" />
          </button>
        </SignUpButton>
        <SignInButton mode="modal">
          <button className="px-8 py-4 border border-gray-300 dark:border-white/20 hover:border-gray-400 dark:hover:border-white/40 text-gray-900 dark:text-white rounded-xl font-semibold text-lg transition-all">
            Sign In
          </button>
        </SignInButton>
      </SignedOut>
      <SignedIn>
        <button onClick={() => router.push('/dashboard')} className={heroCtaClass}>
          Go to Dashboard
          <FiArrowRight className="group-hover:translate-x-1 transition-transform" />
        </button>
      </SignedIn>
    </div>
  );
}
