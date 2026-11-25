import React, { useState } from 'react';
import {
  Sparkles,
  PlayCircle,
  Building2,
  Bell,
  Search,
  CheckCircle2,
  Menu,
} from 'lucide-react';
import { api } from '../../services/api';

interface NavbarProps {
  onOpenChatbot: () => void;
  onOpenMobileMenu?: () => void;
  businessName?: string;
}

export const Navbar: React.FC<NavbarProps> = ({
  onOpenChatbot,
  onOpenMobileMenu,
  businessName = 'Apex Industrial & Electrical Distribution Pvt Ltd',
}) => {
  const [runningScheduler, setRunningScheduler] = useState(false);
  const [schedulerMessage, setSchedulerMessage] = useState<string | null>(null);

  const handleRunScheduler = async () => {
    setRunningScheduler(true);
    setSchedulerMessage(null);
    try {
      const res = await api.runScheduler(true);
      setSchedulerMessage(`Triggered! ${res.dispatched_count} reminders dispatched.`);
      setTimeout(() => setSchedulerMessage(null), 4000);
    } catch (e: any) {
      setSchedulerMessage(`Failed: ${e.message}`);
      setTimeout(() => setSchedulerMessage(null), 4000);
    } finally {
      setRunningScheduler(false);
    }
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-4 md:px-6 flex items-center justify-between sticky top-0 z-10 shadow-xs">
      {/* Left side: Business context */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={onOpenMobileMenu}
          className="md:hidden p-2 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-100"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-navy-800 text-white flex items-center justify-center flex-shrink-0">
            <Building2 className="w-4 h-4" />
          </div>
          <div className="flex flex-col min-w-0">
            <h1 className="font-semibold text-slate-900 text-sm truncate max-w-[200px] sm:max-w-xs md:max-w-md">
              {businessName}
            </h1>
            <span className="text-[11px] text-slate-500 font-medium">
              GSTIN: 27AABCA1234F1Z8 • Mumbai, Maharashtra
            </span>
          </div>
        </div>
      </div>

      {/* Right side: Actions & User */}
      <div className="flex items-center gap-2 sm:gap-3">
        {schedulerMessage && (
          <div className="hidden lg:flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs rounded-full font-medium animate-fadeIn">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>{schedulerMessage}</span>
          </div>
        )}

        {/* Run Scheduler Button */}
        <button
          onClick={handleRunScheduler}
          disabled={runningScheduler}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition-colors disabled:opacity-50"
          title="Run the automated reminder rules engine across all pending invoices"
        >
          <PlayCircle className={`w-3.5 h-3.5 text-teal-600 ${runningScheduler ? 'animate-spin' : ''}`} />
          <span className="hidden sm:inline">Run Scheduler</span>
        </button>

        {/* AI Recovery Assistant Chatbot Trigger */}
        <button
          onClick={onOpenChatbot}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-gradient-to-r from-brand-600 to-royal-600 hover:from-brand-700 hover:to-royal-700 text-white shadow-sm transition-all"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Ask Recovery AI</span>
        </button>

        {/* Profile Avatar */}
        <div className="flex items-center gap-2.5 pl-2 border-l border-slate-200">
          <div className="w-8 h-8 rounded-full bg-slate-200 overflow-hidden ring-2 ring-slate-100 flex items-center justify-center font-bold text-xs text-navy-800">
            RK
          </div>
          <div className="hidden xl:flex flex-col text-left">
            <span className="text-xs font-semibold text-slate-800">Rajesh Kumar</span>
            <span className="text-[10px] text-slate-400">Credit Head</span>
          </div>
        </div>
      </div>
    </header>
  );
};
