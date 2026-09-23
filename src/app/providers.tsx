'use client';

import { useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import ErrorBoundary from '@/components/common/ErrorBoundary';
import { ThemeProvider, useTheme } from '@/context/ThemeContext';
import { useAuthToken } from '@/hooks/useAuthToken';
import { useInterviewReminders } from '@/hooks/useInterviewReminders';
import { identifyUser, resetAnalytics } from '@/lib/analytics';
import { hasUsableClerkKey } from '@/lib/clerk';
import { AnalyticsTracker } from './analytics-provider';

function AuthSideEffects() {
  const { user, isSignedIn } = useUser();
  useAuthToken();
  useInterviewReminders();

  useEffect(() => {
    if (isSignedIn && user) {
      identifyUser(user.id, user.primaryEmailAddress?.emailAddress);
    } else if (!isSignedIn) {
      resetAnalytics();
    }
  }, [isSignedIn, user]);

  return null;
}

function ThemedShell({ children }: { children: React.ReactNode }) {
  const { isDark } = useTheme();

  return (
    <ErrorBoundary>
      {hasUsableClerkKey() ? <AuthSideEffects /> : null}
      <AnalyticsTracker />
      {children}
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme={isDark ? 'dark' : 'light'}
      />
    </ErrorBoundary>
  );
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <ThemedShell>{children}</ThemedShell>
    </ThemeProvider>
  );
}
