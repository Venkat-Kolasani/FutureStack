import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { FaBars, FaTimes } from 'react-icons/fa';
import { UserButton } from '@clerk/clerk-react';

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();

  const navLinks = [
    { path: '/dashboard', label: 'Dashboard' },
    { path: '/internships', label: 'Internships' },
    { path: '/hackathons', label: 'Hackathons' },
    { path: '/status-board', label: 'Status Board' },
    { path: '/calendar', label: 'Calendar' },
    { path: '/documents', label: 'Documents' },
    { path: '/profile', label: 'Profile' },
    { path: '/reports', label: 'Reports' },
    { path: '/analytics', label: 'Analytics' },
  ];

  const isActive = (path) => location.pathname === path;

  return (
    <nav className="backdrop-blur-sm bg-black/40 text-white border-b border-white/10 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex justify-between items-center h-16">
          {/* Logo/Brand with improved typography */}
          <Link
            to="/"
            className="flex items-center gap-2 group"
          >
            <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center group-hover:scale-105 transition-transform">
              <span className="font-bold text-black text-xl">F</span>
            </div>
            <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400 transition-all">
              FutureTracker
            </span>
          </Link>

          {/* Desktop Navigation with improved spacing */}
          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={`text-sm font-medium transition-all duration-200 ${isActive(link.path)
                  ? 'text-white font-semibold'
                  : 'text-gray-300 hover:text-white'
                  }`}
                style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
              >
                {link.label}
              </Link>
            ))}
            {/* User Button for profile and logout */}
            <UserButton
              afterSignOutUrl="/"
              appearance={{
                elements: {
                  avatarBox: "w-9 h-9 ring-2 ring-white/20 hover:ring-white/40 transition-all"
                }
              }}
            />
          </div>

          {/* Mobile Menu Button - cleaner layout */}
          <div className="md:hidden">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="p-2 rounded-md hover:bg-white/10 transition-colors"
              aria-label="Toggle menu"
            >
              {isOpen ? <FaTimes size={22} /> : <FaBars size={22} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation with improved touch targets */}
      {isOpen && (
        <div className="md:hidden bg-black/60 backdrop-blur-md border-t border-white/10">
          <div className="px-4 py-3 space-y-1">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                onClick={() => setIsOpen(false)}
                className={`block py-3 px-4 rounded-md text-base font-medium transition-colors ${isActive(link.path)
                  ? 'bg-white/10 text-white font-semibold'
                  : 'text-gray-300 hover:bg-white/10 hover:text-white'
                  }`}
                style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
              >
                {link.label}
              </Link>
            ))}
            {/* User profile at bottom of mobile menu */}
            <div className="pt-3 mt-2 border-t border-white/10 flex items-center gap-3 px-4 py-3">
              <UserButton
                afterSignOutUrl="/"
                appearance={{
                  elements: {
                    avatarBox: "w-9 h-9 ring-2 ring-white/20"
                  }
                }}
              />
              <span className="text-sm text-gray-300">Account</span>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;

