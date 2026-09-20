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

process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY =
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || 'pk_test_ci_placeholder';
process.env.NEXT_PUBLIC_API_URL =
    process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

jest.mock('next/link', () => {
    const React = require('react');
    const Link = ({ href, children, ...props }) =>
        React.createElement('a', { href, ...props }, children);
    Link.displayName = 'Link';
    return { __esModule: true, default: Link };
});

jest.mock('next/navigation', () => ({
    useRouter: () => ({
        push: jest.fn(),
        replace: jest.fn(),
        back: jest.fn(),
        prefetch: jest.fn(),
    }),
    usePathname: () => '/',
    useParams: () => ({}),
    useSearchParams: () => new URLSearchParams(),
}));

jest.mock('@clerk/nextjs', () => ({
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
// Motion-only props are not valid DOM attributes; drop them so React does not warn.
const MOTION_ONLY_PROPS = [
    'initial', 'animate', 'exit', 'transition', 'variants', 'whileHover', 'whileTap',
    'whileInView', 'whileFocus', 'whileDrag', 'viewport', 'layout', 'layoutId', 'drag',
];

jest.mock('framer-motion', () => ({
    motion: new Proxy({}, {
        get: (_, tag) => {
            const React = require('react');
            return React.forwardRef(({ children, ...props }, ref) => {
                const domProps = { ...props };
                MOTION_ONLY_PROPS.forEach((prop) => delete domProps[prop]);
                return React.createElement(tag, { ...domProps, ref }, children);
            });
        }
    }),
    AnimatePresence: ({ children }) => children,
    useAnimation: () => ({ start: () => {}, stop: () => {} }),
    useInView: () => [null, false],
}));