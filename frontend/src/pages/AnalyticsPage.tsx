import React, { useEffect, useState } from 'react';
import {
  BarChart3,
  Download,
  Calendar,
  CheckCircle2,
  TrendingUp,
  RefreshCw,
  PieChart as PieIcon,
  Award,
  Clock,
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
  LineChart,
  Line,
} from 'recharts';
import { api } from '../services/api';

export const AnalyticsPage: React.FC = () => {
  const [summary, setSummary] = useState<any>(null);
  const [charts, setCharts] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const [sumRes, chartRes] = await Promise.all([
        api.getDashboardSummary(),
        api.getDashboardCharts(),
      ]);
      setSummary(sumRes);
      setCharts(chartRes);
    } catch (e) {
      console.error(e);
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

  const channelPerformance = [
    { channel: 'WhatsApp', sent: 142, responseRate: '68%', recoveryYield: '₹4,85,000' },
    { channel: 'AI Voice Calls', sent: 48, responseRate: '75%', recoveryYield: '₹3,20,000' },
    { channel: 'Email', sent: 189, responseRate: '34%', recoveryYield: '₹2,90,000' },
    { channel: 'DLT SMS', sent: 95, responseRate: '22%', recoveryYield: '₹1,15,000' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Recovery Analytics & Intelligence</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Portfolio metrics, collection efficiency, ageing brackets, and omnichannel channel effectiveness.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <a
            href={api.exportInvoicesUrl}
            download
            className="px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl border border-slate-200 shadow-2xs flex items-center gap-1.5 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Invoices Report</span>
          </a>
          <a
            href={api.exportCustomersUrl}
            download
            className="px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl border border-slate-200 shadow-2xs flex items-center gap-1.5 transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-teal-600" />
            <span>Export Debtors Report</span>
          </a>
        </div>
      </div>

      {/* KPI Highlights */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-card">
          <span className="text-xs font-semibold text-slate-500">Gross Portfolio Exposure</span>
          <div className="text-2xl font-bold text-navy-900 mt-1">
            {formatCurrency((summary?.total_outstanding || 0) + (summary?.collected_this_month || 0))}
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">Active Invoiced Volume</span>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-card">
          <span className="text-xs font-semibold text-slate-500">Recovery Success Rate</span>
          <div className="text-2xl font-bold text-teal-600 mt-1">
            {summary?.recovery_success_rate || 78.5}%
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">Promise Fulfillment Benchmark</span>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-card">
          <span className="text-xs font-semibold text-slate-500">Overdue Concentration</span>
          <div className="text-2xl font-bold text-rose-600 mt-1">
            {summary?.total_outstanding
              ? `${Math.round(((summary?.total_overdue || 0) / summary.total_outstanding) * 100)}%`
              : '0%'}
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">Of active ledger is overdue</span>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-card">
          <span className="text-xs font-semibold text-slate-500">Active Disputes Paused</span>
          <div className="text-2xl font-bold text-purple-600 mt-1">
            {formatCurrency(summary?.open_disputes_amount || 0)}
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">Under commercial review</span>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Ageing Analysis */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-card">
          <h3 className="font-semibold text-slate-900 text-sm mb-1">Receivables Ageing Matrix</h3>
          <p className="text-xs text-slate-500 mb-4">Volume distribution across credit delay intervals</p>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={charts?.ageing_analysis || []} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="bucket" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `₹${v / 1000}k`} />
                <Tooltip
                  formatter={(val: any) => [formatCurrency(Number(val)), 'Amount']}
                  contentStyle={{ borderRadius: '12px' }}
                />
                <Bar dataKey="amount" fill="#2563eb" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Collections vs Target */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-card">
          <h3 className="font-semibold text-slate-900 text-sm mb-1">Collections Realized vs Target</h3>
          <p className="text-xs text-slate-500 mb-4">Monthly collection performance</p>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={charts?.monthly_collections || []} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `₹${v / 1000}k`} />
                <Tooltip
                  formatter={(val: any) => [formatCurrency(Number(val)), '']}
                  contentStyle={{ borderRadius: '12px' }}
                />
                <Line type="monotone" dataKey="collected" stroke="#0d9488" strokeWidth={2.5} name="Collected" />
                <Line type="monotone" dataKey="target" stroke="#94a3b8" strokeDasharray="4 4" strokeWidth={2} name="Target" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Omnichannel Channel Performance Breakdown (Section 16) */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-card">
        <h3 className="font-semibold text-slate-900 text-sm mb-1">Communication Channel Effectiveness</h3>
        <p className="text-xs text-slate-500 mb-4">Comparative response rates and recovery yields by outreach medium</p>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-semibold border-b uppercase">
              <tr>
                <th className="py-3 px-4">Channel</th>
                <th className="py-3 px-4">Notices Dispatched</th>
                <th className="py-3 px-4">Debtor Response Rate</th>
                <th className="py-3 px-4">Attributed Collections</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {channelPerformance.map((c, idx) => (
                <tr key={idx} className="hover:bg-slate-50/70">
                  <td className="py-3 px-4 font-bold text-slate-800">{c.channel}</td>
                  <td className="py-3 px-4 text-slate-600">{c.sent}</td>
                  <td className="py-3 px-4 font-semibold text-teal-600">{c.responseRate}</td>
                  <td className="py-3 px-4 font-bold text-navy-900">{c.recoveryYield}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
