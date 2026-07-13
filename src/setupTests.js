// jest-dom adds custom jest matchers for asserting on DOM nodes.
import '@testing-library/jest-dom';

// Stable "today" for date helper tests across contributor timezones.
process.env.TZ = 'UTC';

class IntersectionObserverMock {
    constructor() {}
    disconnect() {}
    observe() {}
    takeRecords() {
        return [];
    }
    unobserve() {}
}
global.IntersectionObserver = IntersectionObserverMock;

Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query) => ({
        matches: false,
        media: query,
        onchange: null,
        addEventListener: () => {},
        removeEventListener: () => {},
        addListener: () => {},
        removeListener: () => {},
        dispatchEvent: () => false,
    }),
});

process.env.REACT_APP_CLERK_PUBLISHABLE_KEY =
    process.env.REACT_APP_CLERK_PUBLISHABLE_KEY || 'pk_test_ci_placeholder';
process.env.REACT_APP_API_URL =
    process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

jest.mock('@clerk/clerk-react', () => ({
    ClerkProvider: ({ children }) => children,
    useUser: () => ({ isSignedIn: false, user: null, isLoaded: true }),
    useAuth: () => ({
        isSignedIn: false,
        isLoaded: true,
        getToken: jest.fn().mockResolvedValue(null),
    }),
    SignedIn: ({ children }) => null,
    SignedOut: ({ children }) => children,
    SignInButton: ({ children }) => children,
    SignUpButton: ({ children }) => children,
    UserButton: () => null,
}));

jest.mock('./lib/analytics', () => ({
    initAnalytics: jest.fn(),
    trackPageView: jest.fn(),
    identifyUser: jest.fn(),
    resetAnalytics: jest.fn(),
    analytics: {
        opportunityCreated: jest.fn(),
        opportunityUpdated: jest.fn(),
        opportunityDeleted: jest.fn(),
    },
}));
