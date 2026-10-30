import React from 'react';
import {
  ShieldAlert,
  PlusCircle,
  Compass,
  Search,
  History as HistoryIcon,
  Cpu,
  Sun,
  Moon,
  Sparkles,
  X,
  CheckCircle2,
  Building2,
  Layers,
} from 'lucide-react';

export type AppPageTab = 'report' | 'command' | 'track' | 'history' | 'tests';

interface SidebarProps {
  activeTab: AppPageTab;
  setActiveTab: (tab: AppPageTab) => void;
  isDark: boolean;
  toggleDark: () => void;
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
  pendingCount?: number;
  totalCount?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  isDark,
  toggleDark,
  mobileOpen,
  setMobileOpen,
  pendingCount = 0,
  totalCount = 0,
}) => {
  const navItems: {
    id: AppPageTab;
    label: string;
    description: string;
    icon: React.ReactNode;
    badge?: string | number;
    badgeColor?: string;
  }[] = [
    {
      id: 'report',
      label: 'Report Grievance',
      description: 'Citizen intake & AI analysis',
      icon: <PlusCircle className="w-5 h-5 shrink-0" />,
    },
    {
      id: 'command',
      label: 'Command Center',
      description: 'Authority operations & triage',
      icon: <Compass className="w-5 h-5 shrink-0" />,
      badge: pendingCount > 0 ? `${pendingCount} pending` : undefined,
      badgeColor: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
    },
    {
      id: 'track',
      label: 'Track Status',
      description: 'Citizen grievance tracking',
      icon: <Search className="w-5 h-5 shrink-0" />,
    },
    {
      id: 'history',
      label: 'History',
      description: 'Full audit archive & logs',
      icon: <HistoryIcon className="w-5 h-5 shrink-0" />,
      badge: totalCount > 0 ? `${totalCount}` : undefined,
      badgeColor: 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
    },
    {
      id: 'tests',
      label: 'Test Runner',
      description: 'Automated test suites',
      icon: <Cpu className="w-5 h-5 shrink-0" />,
      badge: '11 tests',
      badgeColor: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300',
    },
  ];

  const handleNavClick = (id: AppPageTab) => {
    setActiveTab(id);
    setMobileOpen(false);
  };

  const sidebarContent = (
    <div className="flex flex-col h-full bg-slate-900 text-slate-200 border-r border-slate-800 select-none">
      {/* Brand Header */}
      <div className="p-5 border-b border-slate-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center text-white shadow-md">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-base tracking-tight text-white font-sans">
                  CivicPulse AI
                </span>
                <span className="text-3xs uppercase tracking-wider px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-300 font-mono font-semibold border border-emerald-800/60">
                  v3.8
                </span>
              </div>
              <p className="text-3xs text-slate-400 tracking-wide mt-0.5">
                Municipal Operations Platform
              </p>
            </div>
          </div>

          {/* Mobile close button */}
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            className="md:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Navigation Menu: Exactly 5 items */}
      <div className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
        <div className="px-3 pb-2 text-3xs font-bold uppercase tracking-wider text-slate-500">
          Navigation Menu
        </div>

        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => handleNavClick(item.id)}
              className={`w-full text-left p-3 rounded-xl transition-all flex items-center justify-between gap-3 group ${
                isActive
                  ? 'bg-emerald-600 text-white font-semibold shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/80 font-medium'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className={`p-1 rounded-lg transition-colors ${
                    isActive
                      ? 'text-white'
                      : 'text-slate-400 group-hover:text-emerald-400'
                  }`}
                >
                  {item.icon}
                </div>
                <div className="min-w-0">
                  <div className="text-xs truncate font-medium">{item.label}</div>
                  <div
                    className={`text-3xs truncate ${
                      isActive ? 'text-emerald-100' : 'text-slate-500'
                    }`}
                  >
                    {item.description}
                  </div>
                </div>
              </div>

              {item.badge && (
                <span
                  className={`text-3xs font-mono font-semibold px-2 py-0.5 rounded-full shrink-0 ${
                    isActive
                      ? 'bg-white/20 text-white'
                      : item.badgeColor || 'bg-slate-800 text-slate-300'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Footer System Status & Controls */}
      <div className="p-4 border-t border-slate-800 space-y-3 bg-slate-950/60">
        {/* Gemini Active Badge */}
        <div className="p-2.5 rounded-xl bg-slate-800/70 border border-slate-700/60 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-3xs font-mono text-slate-300">Gemini 3.8 Flash</span>
          </div>
          <span className="text-3xs text-emerald-400 font-semibold uppercase">Online</span>
        </div>

        {/* Theme Toggle & Municipal Info */}
        <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
          <div className="flex items-center gap-1.5 text-3xs font-medium">
            <Building2 className="w-3.5 h-3.5 text-slate-400" />
            <span>Metro Command v3.8</span>
          </div>

          <button
            type="button"
            onClick={toggleDark}
            aria-label="Toggle dark mode"
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors flex items-center gap-1.5 text-3xs"
          >
            {isDark ? (
              <>
                <Sun className="w-3.5 h-3.5 text-amber-400" />
                <span>Light</span>
              </>
            ) : (
              <>
                <Moon className="w-3.5 h-3.5 text-slate-300" />
                <span>Dark</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Persistent Left Sidebar */}
      <aside className="hidden md:flex w-64 flex-col fixed inset-y-0 left-0 z-30 shadow-md">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer Backdrop */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-xs transition-opacity"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile Drawer */}
      <div
        className={`md:hidden fixed inset-y-0 left-0 z-50 w-72 transform transition-transform duration-200 ease-in-out ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {sidebarContent}
      </div>
    </>
  );
};
