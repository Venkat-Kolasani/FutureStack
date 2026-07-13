import { useEffect, lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import { useUser, ClerkProvider } from '@clerk/clerk-react';
import { clerkPublishableKey } from './lib/clerk';
import { HelmetProvider } from 'react-helmet-async';
import 'react-toastify/dist/ReactToastify.css';

// Components - Keep these non-lazy as they're needed immediately
import Navbar from './components/common/Navbar';
import ProtectedRoute from './components/auth/ProtectedRoute';
import ErrorBoundary from './components/common/ErrorBoundary';
import LoadingSpinner from './components/common/LoadingSpinner';
import Home from './pages/Home'; // Landing page - load immediately for best UX

// Context
import { ThemeProvider, useTheme } from './context/ThemeContext';

// Hooks
import { useAuthToken } from './hooks/useAuthToken';
import { useInterviewReminders } from './hooks/useInterviewReminders';

// Analytics
import { trackPageView, identifyUser, resetAnalytics } from './lib/analytics';

// Lazy load authenticated pages for better performance (Code Splitting)
// Home is NOT lazy loaded since it's the entry point for most users
const Dashboard = lazy(() => import('./pages/Dashboard'));
const InternshipList = lazy(() => import('./pages/InternshipList'));
const HackathonList = lazy(() => import('./pages/HackathonList'));
const HackathonDetail = lazy(() => import('./pages/HackathonDetail'));
const InterviewPrepDetail = lazy(() => import('./pages/InterviewPrepDetail'));
const AddOpportunity = lazy(() => import('./pages/AddOpportunity'));
const EditOpportunity = lazy(() => import('./pages/EditOpportunity'));
const StatusBoard = lazy(() => import('./pages/StatusBoard'));
const Calendar = lazy(() => import('./pages/Calendar'));
const Reports = lazy(() => import('./pages/Reports'));
const Analytics = lazy(() => import('./pages/Analytics'));
const Documents = lazy(() => import('./pages/Documents'));
const PublicSharePage = lazy(() => import('./pages/PublicSharePage'));

// Loading fallback component for Suspense
const PageLoader = () => (
  <div className="min-h-screen bg-white dark:bg-black flex items-center justify-center">
    <LoadingSpinner size="lg" />
  </div>
);

function AppContent() {
  const location = useLocation();
  const isHomePage = location.pathname === '/';
  const isPublicSharePage = location.pathname.startsWith('/share/');
  const { user, isSignedIn } = useUser();
  const { isDark } = useTheme();

  // Initialize auth token getter for API calls
  useAuthToken();
  useInterviewReminders();

  // Track page views on route changes (redact public share tokens)
  useEffect(() => {
    if (isPublicSharePage) {
      trackPageView('/share/[token]');
      return;
    }

    trackPageView(location.pathname);
  }, [location.pathname, isPublicSharePage]);

  // Identify user when signed in
  useEffect(() => {
    if (isSignedIn && user) {
      identifyUser(user.id, user.primaryEmailAddress?.emailAddress);
    } else if (!isSignedIn) {
      resetAnalytics();
    }
  }, [isSignedIn, user]);

  return (
    <div className="min-h-screen font-sans transition-colors duration-300">
      {/* Skip to main content link for accessibility */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:bg-white focus:text-black focus:rounded-lg focus:font-semibold"
      >
        Skip to main content
      </a>

      {!isHomePage && !isPublicSharePage && <Navbar />}

      <main id="main-content" role="main">
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/share/:token" element={<PublicSharePage />} />
            <Route path="/dashboard" element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } />
            <Route path="/internships" element={
              <ProtectedRoute>
                <InternshipList />
              </ProtectedRoute>
            } />
            <Route path="/hackathons" element={
              <ProtectedRoute>
                <HackathonList />
              </ProtectedRoute>
            } />
            <Route path="/hackathons/:id" element={
              <ProtectedRoute>
                <HackathonDetail />
              </ProtectedRoute>
            } />
            <Route path="/internships/:id/prep" element={
              <ProtectedRoute>
                <InterviewPrepDetail />
              </ProtectedRoute>
            } />
            <Route path="/add" element={
              <ProtectedRoute>
                <AddOpportunity />
              </ProtectedRoute>
            } />
            <Route path="/edit/:id" element={
              <ProtectedRoute>
                <EditOpportunity />
              </ProtectedRoute>
            } />
            <Route path="/status-board" element={
              <ProtectedRoute>
                <StatusBoard />
              </ProtectedRoute>
            } />
            <Route path="/calendar" element={
              <ProtectedRoute>
                <Calendar />
              </ProtectedRoute>
            } />
            <Route path="/reports" element={
              <ProtectedRoute>
                <Reports />
              </ProtectedRoute>
            } />
            <Route path="/analytics" element={
              <ProtectedRoute>
                <Analytics />
              </ProtectedRoute>
            } />
            <Route path="/documents" element={
              <ProtectedRoute>
                <Documents />
              </ProtectedRoute>
            } />
          </Routes>
        </Suspense>
      </main>

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
    </div>
  );
}

function ClerkThemeProvider({ children }) {
  const { isDark } = useTheme();

  return (
    <ClerkProvider
      publishableKey={clerkPublishableKey}
      appearance={{
        variables: {
          colorBackground: isDark ? '#0A0A0A' : '#ffffff',
          colorText: isDark ? '#ffffff' : '#111827',
          colorPrimary: '#3B82F6',
          colorInputBackground: isDark ? '#1a1a1a' : '#ffffff',
          colorInputText: isDark ? '#ffffff' : '#111827',
          colorDanger: '#EF4444',
          colorSuccess: '#10B981',
          colorWarning: '#F59E0B',
          colorNeutral: isDark ? '#9CA3AF' : '#6B7280',
        },
        elements: {
          card: isDark ? 'border border-white/10 shadow-2xl' : 'border border-gray-200 shadow-xl',
          headerTitle: isDark ? 'text-white' : 'text-gray-900',
          headerSubtitle: isDark ? 'text-gray-400' : 'text-gray-500',
          socialButtonsBlockButton: isDark ? 'bg-white/5 border-white/10 hover:bg-white/10 text-white' : 'bg-white border-gray-200 hover:bg-gray-50 text-gray-900',
          dividerLine: isDark ? 'bg-white/10' : 'bg-gray-200',
          dividerText: isDark ? 'text-gray-400' : 'text-gray-500',
          formFieldLabel: isDark ? 'text-gray-300' : 'text-gray-700',
          formFieldInput: isDark ? 'bg-white/5 border-white/10 text-white' : 'bg-white border-gray-300 text-gray-900',
          footerActionText: isDark ? 'text-gray-400' : 'text-gray-500',
        }
      }}
    >
      {children}
    </ClerkProvider>
  );
}

function App() {
  return (
    <HelmetProvider>
      <ThemeProvider>
        <ClerkThemeProvider>
          <ErrorBoundary>
            <Router>
              <AppContent />
            </Router>
          </ErrorBoundary>
        </ClerkThemeProvider>
      </ThemeProvider>
    </HelmetProvider>
  );
}

export default App;
