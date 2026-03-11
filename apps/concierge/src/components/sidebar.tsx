'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Inbox,
  MessageSquare,
  Users,
  Calendar,
  Shield,
  BookOpen,
  Settings,
  Compass,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/auth';
import { CONCIERGE_NAV } from '@/lib/constants';
import { Avatar } from '@/components/ui/avatar';
import { motion, AnimatePresence } from 'framer-motion';

const iconMap: Record<string, React.ElementType> = {
  LayoutDashboard,
  Inbox,
  MessageSquare,
  Users,
  Calendar,
  Shield,
  BookOpen,
  Settings,
};

const statusColors: Record<string, string> = {
  online: 'bg-green-500',
  away: 'bg-amber-500',
  offline: 'bg-slate-400',
};

export default function Sidebar() {
  const pathname = usePathname();
  const { agent } = useAuth();

  return (
    <aside className="flex flex-col w-64 bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 text-slate-300 shrink-0">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 py-5 border-b border-slate-800/80">
        <motion.div
          whileHover={{ rotate: 15 }}
          transition={{ type: 'spring', stiffness: 300, damping: 15 }}
          className="flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-600"
        >
          <Compass className="h-5 w-5 text-white" />
        </motion.div>
        <div>
          <p className="text-sm font-bold text-white leading-none">Atlas One</p>
          <p className="text-[10px] uppercase tracking-widest text-emerald-400 font-semibold mt-0.5">Concierge</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {CONCIERGE_NAV.map((item) => {
          const Icon = iconMap[item.icon];
          const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
          return (
            <Link key={item.href} href={item.href} className="block">
              <motion.div
                whileHover={{ x: 2 }}
                whileTap={{ scale: 0.98 }}
                className={cn(
                  'relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                  isActive
                    ? 'text-emerald-400'
                    : 'text-slate-400 hover:bg-slate-800/70 hover:text-white',
                )}
              >
                <AnimatePresence>
                  {isActive && (
                    <motion.div
                      layoutId="concierge-nav-active"
                      className="absolute inset-0 rounded-lg bg-emerald-600/15"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                    />
                  )}
                </AnimatePresence>
                {Icon && <Icon className="h-5 w-5 shrink-0 relative z-10" />}
                <span className="flex-1 relative z-10">{item.label}</span>
                {item.badge !== undefined && item.badge > 0 && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="flex items-center justify-center min-w-[20px] h-5 rounded-full bg-emerald-600 text-white text-xs font-semibold px-1.5 relative z-10"
                  >
                    {item.badge}
                  </motion.span>
                )}
              </motion.div>
            </Link>
          );
        })}
      </nav>

      {/* Agent info */}
      {agent && (
        <div className="border-t border-slate-800/80 px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Avatar name={agent.displayName} src={agent.avatarUrl} size="sm" />
              <motion.span
                animate={{
                  boxShadow: agent.status === 'online'
                    ? ['0 0 0 0 rgba(34,197,94,0.4)', '0 0 0 6px rgba(34,197,94,0)', '0 0 0 0 rgba(34,197,94,0.4)']
                    : 'none',
                }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                className={cn(
                  'absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-slate-900',
                  statusColors[agent.status],
                )}
              />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-white truncate">{agent.displayName}</p>
              <p className="text-xs text-slate-500 truncate">{agent.agentId}</p>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
