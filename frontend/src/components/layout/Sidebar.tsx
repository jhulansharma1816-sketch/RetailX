import React from 'react';
import {
  LayoutDashboard,
  Sparkles,
  FileText,
  Users,
  CreditCard,
  CalendarCheck,
  MessageSquare,
  PhoneCall,
  CheckSquare,
  AlertCircle,
  BarChart3,
  Settings,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  TrendingUp,
} from 'lucide-react';

interface SidebarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  setCurrentTab,
  collapsed,
  setCollapsed,
}) => {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'recovery', label: 'AI Recovery Assistant', icon: Sparkles, badge: 'AI' },
    { id: 'invoices', label: 'Invoices', icon: FileText },
    { id: 'customers', label: 'Customers', icon: Users },
    { id: 'payments', label: 'Payments', icon: CreditCard },
    { id: 'promises', label: 'Payment Promises', icon: CalendarCheck },
    { id: 'communications', label: 'Communication Centre', icon: MessageSquare },
    { id: 'voice-calls', label: 'AI Voice Calls', icon: PhoneCall, badge: 'Voice' },
    { id: 'tasks', label: 'Follow-up Tasks', icon: CheckSquare },
    { id: 'disputes', label: 'Disputes', icon: AlertCircle },
    { id: 'analytics', label: 'Analytics & Reports', icon: BarChart3 },
    { id: 'settings', label: 'Settings & Integrations', icon: Settings },
  ];

  return (
    <aside
      className={`bg-white border-r border-slate-200 min-h-screen transition-all duration-300 flex flex-col z-20 select-none ${
        collapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* Brand Header */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-slate-100">
        {!collapsed && (
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-brand-700 via-royal-600 to-teal-500 flex items-center justify-center text-white shadow-md flex-shrink-0">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="font-bold text-slate-900 text-sm tracking-tight truncate leading-tight">
                Smart B2B Recovery
              </span>
              <span className="text-[10px] text-teal-600 font-medium tracking-wide">
                INTELLIGENT SAAS
              </span>
            </div>
          </div>
        )}
        {collapsed && (
          <div className="mx-auto w-9 h-9 rounded-xl bg-gradient-to-tr from-brand-700 via-royal-600 to-teal-500 flex items-center justify-center text-white shadow-md">
            <TrendingUp className="w-5 h-5" />
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors hidden md:flex items-center justify-center"
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setCurrentTab(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-sm transition-all text-left relative group ${
                isActive
                  ? 'bg-brand-50 text-brand-700 shadow-sm border border-brand-100/70 font-semibold'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
              title={collapsed ? item.label : undefined}
            >
              <Icon
                className={`w-5 h-5 flex-shrink-0 transition-colors ${
                  isActive ? 'text-brand-600' : 'text-slate-400 group-hover:text-slate-600'
                }`}
              />
              {!collapsed && <span className="truncate flex-1">{item.label}</span>}
              {!collapsed && item.badge && (
                <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-md bg-teal-50 text-teal-700 border border-teal-200 uppercase tracking-wider">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* System Status Footer */}
      {!collapsed && (
        <div className="p-4 border-t border-slate-100 bg-slate-50/70 m-3 rounded-2xl border">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-xs font-semibold text-slate-800">Demo Active</span>
          </div>
          <p className="text-[11px] text-slate-500 leading-relaxed">
            WhatsApp, SMS & AI Voice operate with certified simulation mode.
          </p>
        </div>
      )}
    </aside>
  );
};
