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

// Mock window.matchMedia (required by ThemeContext and framer-motion)
// Using global assignment instead of Object.defineProperty so CRA does not reset it
global.matchMedia = function(query) {
    return {
        matches: false,
        media: query,
        onchange: null,
        addEventListener: function() {},
        removeEventListener: function() {},
        addListener: function() {},
        removeListener: function() {},
        dispatchEvent: function() { return false; },
    };
};
window.matchMedia = global.matchMedia;

process.env.REACT_APP_CLERK_PUBLISHABLE_KEY =
    process.env.REACT_APP_CLERK_PUBLISHABLE_KEY || 'pk_test_ci_placeholder';
process.env.REACT_APP_API_URL =
    process.env.REACT_APP_API_URL || 'http://localhost:3001/api/v1';

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

// Mock framer-motion to avoid jsdom animation issues
jest.mock('framer-motion', () => ({
    motion: new Proxy({}, {
        get: (_, tag) => {
            const React = require('react');
            return React.forwardRef(({ children, ...props }, ref) =>
                React.createElement(tag, { ...props, ref }, children)
            );
        }
    }),
    AnimatePresence: ({ children }) => children,
    useAnimation: () => ({ start: () => {}, stop: () => {} }),
    useInView: () => [null, false],
}));