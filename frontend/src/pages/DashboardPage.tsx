import React, { useEffect, useState } from 'react';
import {
  DollarSign,
  AlertTriangle,
  CheckCircle,
  Clock,
  Calendar,
  AlertOctagon,
  ShieldAlert,
  Award,
  ArrowUpRight,
  TrendingUp,
  RefreshCw,
  Sparkles,
  PhoneCall,
  MessageSquare,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
} from 'recharts';
import { api } from '../services/api';
import { DashboardSummary } from '../types';

interface DashboardPageProps {
  onNavigate: (tab: string) => void;
  onOpenChatbot: () => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ onNavigate, onOpenChatbot }) => {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [charts, setCharts] = useState<any>(null);
  const [activity, setActivity] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const [sumRes, chartRes, actRes] = await Promise.all([
        api.getDashboardSummary(),
        api.getDashboardCharts(),
        api.getRecentActivity(),
      ]);
      setSummary(sumRes);
      setCharts(chartRes);
      setActivity(actRes);
    } catch (e) {
      console.error('Failed to load dashboard:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(val);
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[500px]">
        <div className="flex flex-col items-center gap-3 text-slate-500">
          <RefreshCw className="w-6 h-6 animate-spin text-brand-600" />
          <p className="text-sm font-medium">Loading live recovery portfolio...</p>
        </div>
      </div>
    );
  }

  const kpis = [
    {
      title: 'Total Outstanding',
      value: formatCurrency(summary?.total_outstanding || 0),
      desc: 'All unpaid active receivables',
      icon: DollarSign,
      color: 'text-navy-900',
      bg: 'bg-navy-50 border-navy-100',
      badge: 'Portfolio',
      badgeColor: 'bg-slate-200/80 text-slate-700',
    },
    {
      title: 'Total Overdue',
      value: formatCurrency(summary?.total_overdue || 0),
      desc: `${summary?.overdue_invoices_count || 0} invoices past due date`,
      icon: AlertTriangle,
      color: 'text-rose-600',
      bg: 'bg-rose-50 border-rose-100',
      badge: 'Immediate Action',
      badgeColor: 'bg-rose-100 text-rose-700 font-semibold',
    },
    {
      title: 'Collected This Month',
      value: formatCurrency(summary?.collected_this_month || 0),
      desc: `${summary?.payments_count_month || 0} payments cleared in Nov`,
      icon: CheckCircle,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50 border-emerald-100',
      badge: 'Collections',
      badgeColor: 'bg-emerald-100 text-emerald-800',
    },
    {
      title: 'Payments Due Soon',
      value: formatCurrency(summary?.due_soon_amount || 0),
      desc: `${summary?.due_soon_count || 0} invoices due in 7 days`,
      icon: Clock,
      color: 'text-amber-600',
      bg: 'bg-amber-50 border-amber-100',
      badge: 'Upcoming',
      badgeColor: 'bg-amber-100 text-amber-800',
    },
    {
      title: "Today's Follow-ups",
      value: summary?.today_followups || 0,
      desc: 'Scheduled calls & notices',
      icon: Calendar,
      color: 'text-royal-600',
      bg: 'bg-blue-50 border-blue-100',
      badge: 'Tasks',
      badgeColor: 'bg-blue-100 text-royal-700',
    },
    {
      title: 'Missed Promises',
      value: summary?.missed_promises_count || 0,
      desc: formatCurrency(summary?.missed_promises_amount || 0),
      icon: AlertOctagon,
      color: 'text-orange-600',
      bg: 'bg-orange-50 border-orange-100',
      badge: 'Escalate',
      badgeColor: 'bg-orange-100 text-orange-800 font-semibold',
    },
    {
      title: 'Open Disputes',
      value: summary?.open_disputes_count || 0,
      desc: formatCurrency(summary?.open_disputes_amount || 0),
      icon: ShieldAlert,
      color: 'text-purple-600',
      bg: 'bg-purple-50 border-purple-100',
      badge: 'Paused',
      badgeColor: 'bg-purple-100 text-purple-800',
    },
    {
      title: 'Recovery Success Rate',
      value: `${summary?.recovery_success_rate || 78}%`,
      desc: 'Promise fulfillment index',
      icon: Award,
      color: 'text-teal-600',
      bg: 'bg-teal-50 border-teal-100',
      badge: 'Performance',
      badgeColor: 'bg-teal-100 text-teal-800',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-navy-900 via-royal-700 to-teal-600 rounded-2xl p-6 text-white shadow-elevated flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-xs text-xs font-medium text-teal-200 mb-2 border border-white/20">
            <Sparkles className="w-3.5 h-3.5" />
            <span>AI Recovery Engine Live</span>
          </div>
          <h2 className="text-xl md:text-2xl font-bold tracking-tight">
            Receivables Intelligence Dashboard
          </h2>
          <p className="text-slate-200 text-xs md:text-sm mt-1 max-w-xl">
            Proactively recover overdue payments with automated WhatsApp workflows, payment promise tracking, and polite AI voice calls.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => onNavigate('recovery')}
            className="px-4 py-2.5 bg-white text-navy-900 hover:bg-slate-100 rounded-xl text-xs md:text-sm font-semibold shadow-sm transition-all flex items-center gap-1.5"
          >
            <span>Open AI Recovery Worklist</span>
            <ArrowUpRight className="w-4 h-4" />
          </button>
          <button
            onClick={onOpenChatbot}
            className="px-4 py-2.5 bg-teal-500 hover:bg-teal-400 text-white rounded-xl text-xs md:text-sm font-semibold shadow-sm transition-all flex items-center gap-1.5"
          >
            <Sparkles className="w-4 h-4" />
            <span>Ask Assistant</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((k, idx) => {
          const Icon = k.icon;
          return (
            <div
              key={idx}
              className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-card hover:shadow-card-hover transition-all"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-slate-500">{k.title}</span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full ${k.badgeColor}`}>
                  {k.badge}
                </span>
              </div>
              <div className="flex items-baseline justify-between mt-1">
                <span className={`text-2xl font-bold tracking-tight ${k.color}`}>
                  {k.value}
                </span>
                <div className={`p-2 rounded-xl ${k.bg}`}>
                  <Icon className={`w-4 h-4 ${k.color}`} />
                </div>
              </div>
              <p className="text-[11px] text-slate-400 mt-2 font-medium">{k.desc}</p>
            </div>
          );
        })}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Ageing Analysis */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-card">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-slate-900 text-sm">Invoice Ageing Breakdown</h3>
              <p className="text-xs text-slate-500">Overdue exposure categorized by days</p>
            </div>
            <span className="text-xs font-medium text-slate-400">Total: {formatCurrency(summary?.total_outstanding || 0)}</span>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={charts?.ageing_analysis || []} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="bucket" tick={{ fontSize: 11 }} />
                <YAxis
                  tick={{ fontSize: 11 }}
                  tickFormatter={(val) => `₹${val / 1000}k`}
                />
                <Tooltip
                  formatter={(val: any) => [formatCurrency(Number(val)), 'Amount']}
                  contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0' }}
                />
                <Bar dataKey="amount" fill="#3b82f6" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Monthly Collections Trend */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-card">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-slate-900 text-sm">Monthly Collections & Target</h3>
              <p className="text-xs text-slate-500">6-Month historical recovery trend</p>
            </div>
            <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">
              Target: +15%
            </span>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={charts?.monthly_collections || []} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                <defs>
                  <linearGradient id="colorCollected" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0d9488" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#0d9488" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(val) => `₹${val / 1000}k`} />
                <Tooltip
                  formatter={(val: any) => [formatCurrency(Number(val)), 'Collected']}
                  contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0' }}
                />
                <Area type="monotone" dataKey="collected" stroke="#0d9488" strokeWidth={2.5} fillOpacity={1} fill="url(#colorCollected)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Customer-wise Outstanding */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-card">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-slate-900 text-sm">Top Customer Receivables</h3>
              <p className="text-xs text-slate-500">Debtors with highest unpaid balances</p>
            </div>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={charts?.customer_outstanding || []}
                layout="vertical"
                margin={{ top: 10, right: 10, left: 30, bottom: 10 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                <XAxis type="number" tickFormatter={(val) => `₹${val / 1000}k`} tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="customer" tick={{ fontSize: 11 }} />
                <Tooltip
                  formatter={(val: any) => [formatCurrency(Number(val)), 'Outstanding']}
                  contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0' }}
                />
                <Bar dataKey="outstanding" fill="#1e40af" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Outstanding vs Collected Pie */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-card">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-slate-900 text-sm">Portfolio Recovery Ratio</h3>
              <p className="text-xs text-slate-500">Collected vs remaining uncollected volume</p>
            </div>
          </div>
          <div className="h-64 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={charts?.outstanding_vs_collected || []}
                  innerRadius={65}
                  outerRadius={95}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {(charts?.outstanding_vs_collected || []).map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(val: any) => [formatCurrency(Number(val)), 'Amount']}
                  contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Recent Activity Feeds */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Latest Payments */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-900 text-sm">Latest Payments</h3>
            <button onClick={() => onNavigate('payments')} className="text-xs text-brand-600 font-semibold hover:underline">
              View All
            </button>
          </div>
          <div className="space-y-3">
            {(activity?.recent_payments || []).map((p: any, idx: number) => (
              <div key={idx} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-slate-800 truncate">{p.company_name}</p>
                  <p className="text-[11px] text-slate-400">{p.invoice_number} • {p.payment_method.toUpperCase()}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <span className="text-xs font-bold text-emerald-600">+{formatCurrency(p.amount)}</span>
                  <p className="text-[10px] text-slate-400">{p.payment_date}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Upcoming Promises */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-900 text-sm">Promised Payment Dates</h3>
            <button onClick={() => onNavigate('promises')} className="text-xs text-brand-600 font-semibold hover:underline">
              View All
            </button>
          </div>
          <div className="space-y-3">
            {(activity?.upcoming_promises || []).map((pr: any, idx: number) => (
              <div key={idx} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-slate-800 truncate">{pr.company_name}</p>
                  <p className="text-[11px] text-slate-400">Due: {pr.promised_date}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <span className="text-xs font-bold text-navy-800">{formatCurrency(pr.promised_amount)}</span>
                  <span className={`block text-[10px] font-semibold ${pr.status === 'missed' ? 'text-rose-600' : 'text-amber-600'}`}>
                    {pr.status.toUpperCase()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Communication Logs */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-900 text-sm">Omnichannel Activity</h3>
            <button onClick={() => onNavigate('communications')} className="text-xs text-brand-600 font-semibold hover:underline">
              View All
            </button>
          </div>
          <div className="space-y-3">
            {(activity?.recent_communications || []).map((c: any, idx: number) => (
              <div key={idx} className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-brand-100 text-brand-800 uppercase">
                    {c.channel.replace('_', ' ')}
                  </span>
                  <span className="text-[10px] text-slate-400">{new Date(c.created_at).toLocaleDateString()}</span>
                </div>
                <p className="text-xs font-semibold text-slate-800 mt-1 truncate">{c.company_name}</p>
                <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">{c.message_body || c.subject_or_title}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
