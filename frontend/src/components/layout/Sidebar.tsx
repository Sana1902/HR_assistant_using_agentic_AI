import { useMemo } from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Users, BarChart3, FileText, Settings, UserPlus, Bot, X } from 'lucide-react';
import { motion } from 'framer-motion';

const navigation = [
  { name: 'Agent Dashboard', href: '/agents', icon: Bot },
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Employees', href: '/employees', icon: Users },
  { name: 'Hire Employee', href: '/hire', icon: UserPlus },
  { name: 'Analytics', href: '/analytics', icon: BarChart3 },
  { name: 'Policies', href: '/policies', icon: FileText },
  { name: 'Settings', href: '/settings', icon: Settings },
];

type SidebarProps = {
  onNavigate?: () => void;
  onClose?: () => void;
};

export const Sidebar = ({ onNavigate, onClose }: SidebarProps) => {
  const navItemClasses = useMemo(
    () =>
      ({
        active: 'bg-gradient-to-r from-purple-600 via-violet-600 to-fuchsia-600 text-white border-transparent shadow-lg shadow-purple-500/30',
        idle: 'bg-slate-800/60 text-slate-200 border-slate-700/60 hover:border-purple-500/50 hover:bg-slate-800/90 hover:text-white',
      }),
    []
  );

  return (
    <div className="w-72 h-full bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 border-r border-slate-800/80 flex flex-col shadow-2xl shadow-slate-950/40">
      <div className="p-6 border-b border-slate-800/80">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight bg-gradient-to-r from-purple-300 via-violet-300 to-fuchsia-400 bg-clip-text text-transparent">
              Next-Gen HR
            </h1>
            <p className="text-xs font-medium uppercase tracking-[0.35em] text-slate-500">TalentFlow</p>
          </div>
          <button
            onClick={onClose}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-700/70 bg-slate-800/70 text-slate-300 hover:border-purple-500/60 hover:bg-slate-800 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/60"
            aria-label="Close sidebar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
      <motion.nav
        key="sidebar-menu"
        initial={{ opacity: 0, x: -24 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -24 }}
        transition={{ type: 'spring', duration: 0.5, bounce: 0 }}
        className="flex-1 px-5 py-6 space-y-4 overflow-y-auto custom-scrollbar"
      >
        <motion.div
          initial="initial"
          animate="animate"
          variants={{
            initial: { transition: { staggerChildren: 0.035 } },
            animate: { transition: { staggerChildren: 0.05 } },
          }}
          className="space-y-3"
        >
          {navigation.map((item) => (
            <motion.div
              key={item.name}
              variants={{
                initial: { opacity: 0, y: 12 },
                animate: { opacity: 1, y: 0 },
              }}
            >
              <NavLink
                to={item.href}
                className={({ isActive }) =>
                  [
                    'group relative flex items-center justify-between gap-3 rounded-2xl border px-4 py-3 transition-all duration-200 backdrop-blur-sm',
                    isActive ? navItemClasses.active : navItemClasses.idle,
                    'focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-400/70',
                  ].join(' ')
                }
                onClick={onNavigate}
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900/40 text-slate-200 transition-colors duration-200 group-hover:bg-white/15">
                    <item.icon className="w-5 h-5" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold tracking-wide">{item.name}</span>
                    <span className="text-xs text-slate-400 group-hover:text-slate-200 transition-colors duration-200">
                      Explore {item.name.toLowerCase()}
                    </span>
                  </div>
                </div>
                <div className="h-2 w-2 rounded-full bg-slate-500/40 group-hover:bg-fuchsia-300 transition-colors duration-200" />
              </NavLink>
            </motion.div>
          ))}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.4 }}
          className="rounded-2xl border border-purple-500/30 bg-gradient-to-br from-purple-500/10 via-violet-500/10 to-transparent p-4"
        >
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-purple-400 mb-2">
            Productivity Tip
          </p>
          <p className="text-sm text-slate-300/90 leading-relaxed">
            Customize your HR workflows and agent automations to unlock the full potential of Next-Gen HR.
          </p>
        </motion.div>
      </motion.nav>
    </div>
  );
};

