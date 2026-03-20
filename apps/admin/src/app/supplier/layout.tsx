'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  BarChart3,
  Building2,
  Gift,
  Star,
  Trophy,
  ChevronLeft,
  ChevronRight,
  Crown,
} from 'lucide-react';

const supplierNavItems = [
  { label: 'Dashboard', href: '/supplier', icon: LayoutDashboard },
  { label: 'Analytics', href: '/supplier/analytics', icon: BarChart3 },
  { label: 'Profile', href: '/supplier/profile', icon: Building2 },
  { label: 'Perks', href: '/supplier/perks', icon: Gift },
  { label: 'Reviews', href: '/supplier/reviews', icon: Star },
  { label: 'Ranking', href: '/supplier/ranking', icon: Trophy },
];

export default function SupplierLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  const isActive = (href: string) => {
    if (href === '/supplier') return pathname === '/supplier';
    return pathname.startsWith(href);
  };

  return (
    <div className="flex h-full -m-6 lg:-m-8">
      {/* Supplier Sidebar */}
      <aside
        className={cn(
          'flex flex-col flex-shrink-0 border-r border-slate-200 bg-white dark:bg-slate-900 dark:border-slate-700 transition-all duration-300',
          collapsed ? 'w-16' : 'w-60',
        )}
      >
        {/* Supplier Header */}
        <div className={cn('px-4 py-5 border-b border-slate-200 dark:border-slate-700', collapsed && 'px-2')}>
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0 h-9 w-9 bg-gradient-to-br from-amber-400 to-amber-600 rounded-lg flex items-center justify-center shadow-sm">
              <Crown className="h-5 w-5 text-white" />
            </div>
            {!collapsed && (
              <div className="min-w-0">
                <span className="block text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                  Supplier Console
                </span>
                <span className="block text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                  Luxury Authority
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
          {supplierNavItems.map((item) => {
            const active = isActive(item.href);
            const Icon = item.icon;

            return (
              <Link key={item.href} href={item.href} className="block relative">
                <motion.div
                  whileHover={{ x: collapsed ? 0 : 3 }}
                  whileTap={{ scale: 0.98 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors relative',
                    active
                      ? 'bg-amber-50 text-amber-800 dark:bg-amber-900/20 dark:text-amber-300'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200',
                    collapsed && 'justify-center px-2',
                  )}
                  title={collapsed ? item.label : undefined}
                >
                  {active && (
                    <motion.div
                      layoutId="supplier-active-indicator"
                      className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-amber-500 rounded-r"
                      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                    />
                  )}
                  <Icon className="h-5 w-5 flex-shrink-0" />
                  {!collapsed && <span>{item.label}</span>}
                </motion.div>
              </Link>
            );
          })}
        </nav>

        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex items-center justify-center gap-2 px-3 py-3 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors border-t border-slate-200 dark:border-slate-700"
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : (
            <>
              <ChevronLeft className="h-4 w-4" />
              <span>Collapse</span>
            </>
          )}
        </button>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto p-6 lg:p-8 bg-slate-50 dark:bg-slate-950">
        {children}
      </main>
    </div>
  );
}
