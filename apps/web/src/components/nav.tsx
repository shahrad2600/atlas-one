'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Menu,
  X,
  Building2,
  Plane,
  UtensilsCrossed,
  Compass,
  Car,
  Ship,
  User,
  MapPin,
  Award,
  Settings,
  LogOut,
  ChevronDown,
  Moon,
  Sun,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/auth';
import { useTheme } from '@/components/theme-provider';
import { CATEGORIES } from '@/lib/constants';
import { Avatar } from '@/components/ui/avatar';

const iconMap: Record<string, React.ElementType> = {
  Building2,
  Plane,
  UtensilsCrossed,
  Compass,
  Car,
  Ship,
};

export default function Nav() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  // Detect scroll for shadow
  useEffect(() => {
    function handleScroll() {
      setScrolled(window.scrollY > 10);
    }
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close profile dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        profileRef.current &&
        !profileRef.current.contains(e.target as Node)
      ) {
        setProfileOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  return (
    <header
      className={cn(
        'fixed top-0 left-0 right-0 z-40 border-b transition-all duration-300',
        'bg-[#FDF5E6]/90 dark:bg-[#1C1008]/90 backdrop-blur-xl',
        'border-[#CDB499]/60 dark:border-[#50301C]/60',
        scrolled && 'shadow-elevation-2',
      )}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link
          href="/"
          className="flex items-center gap-2 font-bold text-xl text-brand-500 dark:text-brand-400 font-heading"
        >
          <Compass className="h-6 w-6" />
          <span>Atlas One</span>
        </Link>

        {/* Desktop category links */}
        <nav className="hidden md:flex items-center gap-1">
          {CATEGORIES.map((cat) => {
            const Icon = iconMap[cat.icon];
            return (
              <Link
                key={cat.key}
                href={cat.href}
                className={cn(
                  'flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  pathname === cat.href
                    ? 'bg-brand-50 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300'
                    : 'text-[#3C2415]/70 hover:bg-brand-50 hover:text-brand-700 dark:text-[#F5E6D3]/70 dark:hover:bg-brand-900/30 dark:hover:text-brand-300',
                )}
              >
                {Icon && <Icon className="h-4 w-4" />}
                {cat.label}
              </Link>
            );
          })}
        </nav>

        {/* Right side */}
        <div className="flex items-center gap-2">
          {/* Dark mode toggle */}
          <button
            onClick={toggleTheme}
            className="rounded-lg p-2 text-[#3C2415]/70 hover:bg-brand-50 dark:text-[#F5E6D3]/70 dark:hover:bg-brand-900/30 transition-colors"
            aria-label="Toggle dark mode"
          >
            {theme === 'dark' ? (
              <Sun className="h-5 w-5" />
            ) : (
              <Moon className="h-5 w-5" />
            )}
          </button>

          {user ? (
            <div ref={profileRef} className="relative hidden md:block">
              <button
                onClick={() => setProfileOpen(!profileOpen)}
                className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-brand-50 dark:hover:bg-brand-900/30 transition-colors"
              >
                <Avatar
                  name={user.displayName}
                  src={user.avatarUrl}
                  size="sm"
                />
                <span className="text-sm font-medium text-[#3C2415] dark:text-[#F5E6D3] max-w-[120px] truncate">
                  {user.displayName}
                </span>
                <ChevronDown
                  className={cn(
                    'h-4 w-4 text-[#3C2415]/50 transition-transform duration-200',
                    profileOpen && 'rotate-180',
                  )}
                />
              </button>

              <AnimatePresence>
                {profileOpen && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: -4 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -4 }}
                    transition={{ duration: 0.15, ease: 'easeOut' }}
                    className="absolute right-0 top-full mt-1 w-56 rounded-xl border border-[#CDB499]/50 bg-[#FDF5E6] py-1 shadow-elevation-3 dark:border-[#50301C] dark:bg-[#2C1810]"
                  >
                    <div className="border-b border-[#CDB499]/30 dark:border-[#50301C]/50 px-4 py-3">
                      <p className="text-sm font-medium text-[#3C2415] dark:text-[#F5E6D3]">
                        {user.displayName}
                      </p>
                      <p className="text-xs text-[#3C2415]/50 dark:text-[#F5E6D3]/50">
                        {user.email}
                      </p>
                    </div>
                    <Link
                      href="/profile"
                      onClick={() => setProfileOpen(false)}
                      className="flex items-center gap-2 px-4 py-2 text-sm text-[#3C2415] hover:bg-brand-50 dark:text-[#F5E6D3] dark:hover:bg-brand-900/20"
                    >
                      <User className="h-4 w-4" />
                      Profile
                    </Link>
                    <Link
                      href="/trips"
                      onClick={() => setProfileOpen(false)}
                      className="flex items-center gap-2 px-4 py-2 text-sm text-[#3C2415] hover:bg-brand-50 dark:text-[#F5E6D3] dark:hover:bg-brand-900/20"
                    >
                      <MapPin className="h-4 w-4" />
                      My Trips
                    </Link>
                    <Link
                      href="/loyalty"
                      onClick={() => setProfileOpen(false)}
                      className="flex items-center gap-2 px-4 py-2 text-sm text-[#3C2415] hover:bg-brand-50 dark:text-[#F5E6D3] dark:hover:bg-brand-900/20"
                    >
                      <Award className="h-4 w-4" />
                      Loyalty
                    </Link>
                    <Link
                      href="/settings"
                      onClick={() => setProfileOpen(false)}
                      className="flex items-center gap-2 px-4 py-2 text-sm text-[#3C2415] hover:bg-brand-50 dark:text-[#F5E6D3] dark:hover:bg-brand-900/20"
                    >
                      <Settings className="h-4 w-4" />
                      Settings
                    </Link>
                    <div className="border-t border-[#CDB499]/30 dark:border-[#50301C]/50">
                      <button
                        onClick={() => {
                          setProfileOpen(false);
                          logout();
                        }}
                        className="flex w-full items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                      >
                        <LogOut className="h-4 w-4" />
                        Log Out
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ) : (
            <div className="hidden md:flex items-center gap-2">
              <Link
                href="/login"
                className="inline-flex items-center justify-center rounded-lg px-3 py-1.5 text-sm font-medium text-[#3C2415] hover:bg-brand-50 dark:text-[#F5E6D3] dark:hover:bg-brand-900/30 transition-colors"
              >
                Log In
              </Link>
              <Link
                href="/signup"
                className="inline-flex items-center justify-center rounded-lg bg-brand-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-600 dark:bg-brand-400 dark:hover:bg-brand-500 dark:text-[#1C1008] transition-colors"
              >
                Sign Up
              </Link>
            </div>
          )}

          {/* Mobile hamburger */}
          <button
            className="md:hidden rounded-lg p-2 text-[#3C2415]/70 hover:bg-brand-50 dark:text-[#F5E6D3]/70 dark:hover:bg-brand-900/30 transition-colors"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
          >
            {mobileOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile slide-out drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 top-16 z-30 bg-black/30 md:hidden"
              onClick={() => setMobileOpen(false)}
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="fixed top-16 right-0 bottom-0 z-40 w-72 overflow-y-auto border-l border-[#CDB499]/50 bg-[#FDF5E6] dark:border-[#50301C] dark:bg-[#1C1008] md:hidden"
            >
              <div className="p-4">
                {user && (
                  <div className="mb-4 flex items-center gap-3 rounded-lg bg-brand-50 dark:bg-brand-900/20 p-3">
                    <Avatar
                      name={user.displayName}
                      src={user.avatarUrl}
                      size="md"
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-[#3C2415] dark:text-[#F5E6D3] truncate">
                        {user.displayName}
                      </p>
                      <p className="text-xs text-[#3C2415]/50 dark:text-[#F5E6D3]/50 truncate">
                        {user.email}
                      </p>
                    </div>
                  </div>
                )}

                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-brand-500/60 dark:text-brand-400/60">
                  Explore
                </p>
                <nav className="space-y-1">
                  {CATEGORIES.map((cat) => {
                    const Icon = iconMap[cat.icon];
                    return (
                      <Link
                        key={cat.key}
                        href={cat.href}
                        className={cn(
                          'flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                          pathname === cat.href
                            ? 'bg-brand-50 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300'
                            : 'text-[#3C2415]/70 hover:bg-brand-50 dark:text-[#F5E6D3]/70 dark:hover:bg-brand-900/30',
                        )}
                      >
                        {Icon && <Icon className="h-4 w-4" />}
                        {cat.label}
                      </Link>
                    );
                  })}
                </nav>

                {user ? (
                  <>
                    <p className="mb-2 mt-6 text-xs font-semibold uppercase tracking-wider text-brand-500/60 dark:text-brand-400/60">
                      Account
                    </p>
                    <nav className="space-y-1">
                      <Link
                        href="/profile"
                        className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-[#3C2415]/70 hover:bg-brand-50 dark:text-[#F5E6D3]/70 dark:hover:bg-brand-900/30"
                      >
                        <User className="h-4 w-4" /> Profile
                      </Link>
                      <Link
                        href="/trips"
                        className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-[#3C2415]/70 hover:bg-brand-50 dark:text-[#F5E6D3]/70 dark:hover:bg-brand-900/30"
                      >
                        <MapPin className="h-4 w-4" /> My Trips
                      </Link>
                      <Link
                        href="/loyalty"
                        className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-[#3C2415]/70 hover:bg-brand-50 dark:text-[#F5E6D3]/70 dark:hover:bg-brand-900/30"
                      >
                        <Award className="h-4 w-4" /> Loyalty
                      </Link>
                      <Link
                        href="/settings"
                        className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-[#3C2415]/70 hover:bg-brand-50 dark:text-[#F5E6D3]/70 dark:hover:bg-brand-900/30"
                      >
                        <Settings className="h-4 w-4" /> Settings
                      </Link>
                      <button
                        onClick={logout}
                        className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                      >
                        <LogOut className="h-4 w-4" /> Log Out
                      </button>
                    </nav>
                  </>
                ) : (
                  <div className="mt-6 space-y-2">
                    <Link
                      href="/login"
                      className="flex w-full items-center justify-center rounded-lg border border-[#CDB499] bg-[#FDF5E6] px-4 py-2 text-sm font-medium text-[#3C2415] hover:bg-brand-50 dark:border-[#50301C] dark:bg-[#2C1810] dark:text-[#F5E6D3] dark:hover:bg-brand-900/30 transition-colors"
                    >
                      Log In
                    </Link>
                    <Link
                      href="/signup"
                      className="flex w-full items-center justify-center rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 dark:bg-brand-400 dark:hover:bg-brand-500 dark:text-[#1C1008] transition-colors"
                    >
                      Sign Up
                    </Link>
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </header>
  );
}
