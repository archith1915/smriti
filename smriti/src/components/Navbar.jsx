import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Moon, Sun, BookOpen, CheckSquare, Calendar, Settings, Menu, X, LogOut, Home, StickyNote, Timer } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const Navbar = () => {
  const { theme, toggleTheme } = useTheme();
  const { logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    {path: '/', label: 'Dashboard', icon: Home},
    { path: '/journals', label: 'Journals', icon: BookOpen },
    { path: '/notes', label: 'Notes', icon: StickyNote },
    { path: '/tasks', label: 'Tasks', icon: CheckSquare },
    { path: '/calendar', label: 'Calendar', icon: Calendar },
    {path: '/timers', label: 'Timers', icon: Timer},
    { path: '/settings', label: 'Settings', icon: Settings },
  ];

  const isActive = (path) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  const handleLogout = async () => {
    try {
      await logout();
      toast.success('Logged out successfully');
      navigate('/auth');
    } catch (error) {
      toast.error('Failed to logout');
    }
  };

  return (
    <nav className="sticky top-0 z-50
  bg-white dark:bg-[#191919]
  border-b border-gray-200 dark:border-[#2a2a2a]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-12">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2 group">
            <img src="/smriti-logo.svg" alt="Smriti" className="w-6 h-6" />
            <span className="text-sm font-semibold hidden sm:block">Smriti</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-1">
            {navItems.map(({ path, label, icon: Icon }) => (
              <Link
                key={path}
                to={path}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                  isActive(path)
  ? 'bg-[#f3f3f1] dark:bg-[#1f1f1f] text-gray-900 dark:text-gray-100'
  : 'text-gray-600 dark:text-gray-400 hover:bg-[#f3f3f1] dark:hover:bg-[#1f1f1f]'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{label}</span>
              </Link>
            ))}
          </div>

          {/* Right side actions */}
          <div className="flex items-center space-x-2">
            {/* <button
              onClick={toggleTheme}
              className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? (
                <Sun className="w-4 h-4 text-gray-400" />
              ) : (
                <Moon className="w-4 h-4 text-gray-600" />
              )}
            </button> */}

            <button
              onClick={handleLogout}
              className="hidden md:flex items-center space-x-1 px-3 py-1.5 rounded text-xs font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Logout</span>
            </button>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden py-3 space-y-1 border-t border-gray-200 dark:border-gray-800">
            {navItems.map(({ path, label, icon: Icon }) => (
              <Link
                key={path}
                to={path}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center space-x-2 px-3 py-2 rounded text-sm transition-colors ${
                  isActive(path)
  ? 'bg-[#f3f3f1] dark:bg-[#1f1f1f] text-gray-900 dark:text-gray-100'
  : 'text-gray-600 dark:text-gray-400 hover:bg-[#f3f3f1] dark:hover:bg-[#1f1f1f]'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{label}</span>
              </Link>
            ))}
            <button
              onClick={handleLogout}
              className="w-full flex items-center space-x-2 px-3 py-2 rounded text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/50"
            >
              <LogOut className="w-4 h-4" />
              <span>Logout</span>
            </button>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;