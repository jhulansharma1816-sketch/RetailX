import React, { useEffect, useState } from 'react';
import {
  Sparkles,
  AlertTriangle,
  Clock,
  ShieldAlert,
  MessageSquare,
  PhoneCall,
  Mail,
  CalendarCheck,
  CheckCircle2,
  RefreshCw,
  Search,
  Check,
  Send,
  Loader2,
  HelpCircle,
  X,
} from 'lucide-react';
import { api } from '../services/api';
import { RecoveryWorklistItem } from '../types';

export const RecoveryAssistantPage: React.FC = () => {
  const [worklist, setWorklist] = useState<RecoveryWorklistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'high' | 'medium' | 'low' | 'dispute'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Action Modals State
  const [selectedItem, setSelectedItem] = useState<RecoveryWorklistItem | null>(null);
  const [actionType, setActionType] = useState<'whatsapp' | 'voice' | 'email' | 'promise' | null>(null);
  const [actionMessage, setActionMessage] = useState('');
  const [executing, setExecuting] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);

  // Promise fields
  const [promisedAmount, setPromisedAmount] = useState<number>(0);
  const [promisedDate, setPromisedDate] = useState<string>('');
  const [promiseNotes, setPromiseNotes] = useState<string>('');

  // Voice simulated intent
  const [voiceIntent, setVoiceIntent] = useState<'will_pay_soon' | 'already_paid' | 'call_back_later' | 'dispute_raised' | 'human_request'>('will_pay_soon');

  const loadWorklist = async () => {
    setLoading(true);
    try {
      const res = await api.getRecoveryWorklist();
      setWorklist(res.worklist);
    } catch (e) {
      console.error('Failed to load worklist:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWorklist();
  }, []);

  const openActionModal = (item: RecoveryWorklistItem, type: 'whatsapp' | 'voice' | 'email' | 'promise') => {
    setSelectedItem(item);
    setActionType(type);
    setPromisedAmount(item.remaining_amount);
    
    // Default tomorrow for promises
    const tom = new Date();
    tom.setDate(tom.getDate() + 2);
    setPromisedDate(tom.toISOString().split('T')[0]);

    if (type === 'whatsapp') {
      setActionMessage(
        `Hello ${item.contact_person},\n\nThis is a friendly payment reminder from Apex Industrial regarding invoice ${item.invoice_number} for ₹${item.remaining_amount.toLocaleString('en-IN')}.\n\nDue date was ${item.due_date} (${item.days_overdue > 0 ? `${item.days_overdue} days overdue` : 'due soon'}).\n\nPlease let us know your confirmed payment transfer date or share the transaction receipt.\n\nThank you,\nFinance & Credit Team`
      );
    } else if (type === 'email') {
      setActionMessage(
        `Dear ${item.contact_person},\n\nWe hope this email finds you well.\n\nWe would like to remind you that invoice ${item.invoice_number} amounting to ₹${item.remaining_amount.toLocaleString('en-IN')} remains pending for clearance. The due date was ${item.due_date}.\n\nKindly process the payment via NEFT/RTGS to our bank account or notify us of your expected settlement date.\n\nBest regards,\nApex Industrial Pvt Ltd`
      );
    } else if (type === 'voice') {
      setActionMessage(
        `Hello, this is an automated payment assistant calling on behalf of Apex Industrial. We are calling regarding invoice ${item.invoice_number} with an outstanding balance of ₹${item.remaining_amount.toLocaleString('en-IN')}. Could you please let us know when we can expect the payment?`
      );
    }
  };

  const handleExecuteAction = async () => {
    if (!selectedItem || !actionType) return;
    setExecuting(true);
    try {
      if (actionType === 'promise') {
        await api.recordPromise({
          customer_id: selectedItem.customer_id,
          invoice_id: selectedItem.invoice_id,
          promised_amount: promisedAmount,
          promised_date: promisedDate,
          commitment_notes: promiseNotes || `Promised payment of ₹${promisedAmount} by ${promisedDate}`,
        });
        setNotification(`Payment promise of ₹${promisedAmount.toLocaleString('en-IN')} recorded for ${selectedItem.company_name}!`);
      } else {
        const payload: any = {
          action_type: actionType === 'voice' ? 'voice_call' : actionType,
          customer_id: selectedItem.customer_id,
          invoice_id: selectedItem.invoice_id,
          recipient: actionType === 'email' ? selectedItem.email : selectedItem.phone,
          message: actionMessage,
          voice_intent: voiceIntent,
        };
        const res = await api.executeRecoveryAction(payload);
        setNotification(res.message || `${actionType.toUpperCase()} action successfully dispatched in DEMO MODE.`);
      }

      setActionType(null);
      setSelectedItem(null);
      loadWorklist();
      setTimeout(() => setNotification(null), 5000);
    } catch (e: any) {
      setNotification(`Error: ${e.message}`);
      setTimeout(() => setNotification(null), 5000);
    } finally {
      setExecuting(false);
    }
  };

  const filteredWorklist = worklist.filter((item) => {
    const matchesFilter = filter === 'all' || item.priority_level === filter;
    const matchesSearch =
      item.company_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.invoice_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.contact_person.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(val);
  };

  return (
    <div className="space-y-6">
      {/* Notification Toast */}
      {notification && (
        <div className="p-4 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center justify-between animate-fadeIn shadow-sm">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            <span className="text-sm font-medium">{notification}</span>
          </div>
          <button onClick={() => setNotification(null)} className="text-emerald-600 hover:text-emerald-800">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-card flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-brand-50 text-brand-700 text-xs font-semibold rounded-full border border-brand-100 mb-2">
            <Sparkles className="w-3.5 h-3.5 text-brand-600" />
            <span>Intelligent Recovery Assistant</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            AI-Prioritized Recovery Worklist
          </h2>
          <p className="text-xs text-slate-500 mt-1 max-w-2xl">
            Each debtor is dynamically scored based on overdue age, missed promises, dispute flags, and financial exposure. Transparent reasons explain every recommendation.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadWorklist}
            className="p-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
            title="Recalculate live scores"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Filter Chips & Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          {[
            { id: 'all', label: `All Invoices (${worklist.length})` },
            { id: 'high', label: `High Priority (${worklist.filter((w) => w.priority_level === 'high').length})` },
            { id: 'medium', label: `Medium Priority (${worklist.filter((w) => w.priority_level === 'medium').length})` },
            { id: 'low', label: `Low Priority (${worklist.filter((w) => w.priority_level === 'low').length})` },
            { id: 'dispute', label: `Disputes (${worklist.filter((w) => w.priority_level === 'dispute').length})` },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id as any)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                filter === tab.id
                  ? 'bg-navy-900 text-white shadow-xs'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search debtor or invoice..."
            className="w-full pl-9 pr-4 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
          />
        </div>
      </div>

      {/* Worklist Cards */}
      <div className="space-y-4">
        {loading ? (
          <div className="p-12 text-center text-slate-400">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-brand-600 mb-2" />
            <p className="text-sm font-medium">Computing recovery prioritization scores...</p>
          </div>
        ) : filteredWorklist.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center border border-slate-200">
            <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
            <h4 className="font-semibold text-slate-800 text-base">No pending recovery actions</h4>
            <p className="text-xs text-slate-400 mt-1">All accounts in this filter are currently up to date.</p>
          </div>
        ) : (
          filteredWorklist.map((item) => {
            const isDispute = item.priority_level === 'dispute';
            const isHigh = item.priority_level === 'high';
            const isMed = item.priority_level === 'medium';

            const badgeBg = isDispute
              ? 'bg-purple-50 text-purple-700 border-purple-200'
              : isHigh
              ? 'bg-rose-50 text-rose-700 border-rose-200'
              : isMed
              ? 'bg-amber-50 text-amber-700 border-amber-200'
              : 'bg-slate-100 text-slate-700 border-slate-200';

            return (
              <div
                key={item.invoice_id}
                className="bg-white rounded-2xl p-5 border border-slate-200 shadow-card hover:shadow-card-hover transition-all"
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  {/* Left: Customer & Priority Badge */}
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border uppercase tracking-wider ${badgeBg}`}>
                        {item.priority}
                      </span>
                      <span className="text-xs font-semibold text-slate-400">
                        Score: {item.score}/100
                      </span>
                      <span className="text-xs font-semibold text-slate-700">
                        • {item.invoice_number}
                      </span>
                      {item.days_overdue > 0 ? (
                        <span className="text-xs font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-md">
                          {item.days_overdue} days overdue
                        </span>
                      ) : (
                        <span className="text-xs font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                          Due on {item.due_date}
                        </span>
                      )}
                    </div>

                    <h3 className="text-base font-bold text-slate-900 tracking-tight truncate">
                      {item.company_name}
                    </h3>
                    <p className="text-xs text-slate-500">
                      Contact: <span className="font-medium text-slate-700">{item.contact_person}</span> • Phone: <span className="font-medium text-slate-700">{item.phone}</span>
                    </p>

                    {/* Transparent Reason Box (Section 8) */}
                    <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-200/80 text-xs text-slate-700 mt-2">
                      <span className="font-semibold text-slate-900">Why this recommendation: </span>
                      {item.explanation}
                    </div>
                  </div>

                  {/* Center: Financial Figures */}
                  <div className="lg:text-right border-t lg:border-t-0 pt-3 lg:pt-0 border-slate-100 flex-shrink-0">
                    <span className="text-xs text-slate-400 block font-medium">Outstanding Balance</span>
                    <span className="text-xl font-bold text-navy-900">{formatCurrency(item.remaining_amount)}</span>
                    <span className="text-[11px] text-slate-400 block mt-0.5">Total Invoiced: {formatCurrency(item.total_amount)}</span>
                  </div>

                  {/* Right: Suggested Action & Direct Triggers */}
                  <div className="flex flex-col sm:flex-row lg:flex-col gap-2 flex-shrink-0 pt-2 lg:pt-0">
                    <span className="text-[11px] font-semibold text-slate-500 lg:text-right">
                      Suggested: <span className="text-teal-700">{item.suggested_action}</span>
                    </span>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <button
                        onClick={() => openActionModal(item, 'whatsapp')}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg flex items-center gap-1 transition-colors shadow-2xs"
                        title="Send customizable WhatsApp reminder"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>WhatsApp</span>
                      </button>

                      <button
                        onClick={() => openActionModal(item, 'voice')}
                        className="px-3 py-1.5 bg-royal-600 hover:bg-royal-700 text-white text-xs font-semibold rounded-lg flex items-center gap-1 transition-colors shadow-2xs"
                        title="Schedule automated AI polite phone call"
                      >
                        <PhoneCall className="w-3.5 h-3.5" />
                        <span>AI Call</span>
                      </button>

                      <button
                        onClick={() => openActionModal(item, 'promise')}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg flex items-center gap-1 transition-colors"
                        title="Record customer commitment date"
                      >
                        <CalendarCheck className="w-3.5 h-3.5 text-slate-600" />
                        <span>Promise</span>
                      </button>

                      <button
                        onClick={() => openActionModal(item, 'email')}
                        className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg flex items-center gap-1 transition-colors"
                        title="Send formal email reminder"
                      >
                        <Mail className="w-3.5 h-3.5 text-slate-600" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Action Execution Modal */}
      {actionType && selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-elevated w-full max-w-lg p-6 border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                {actionType === 'whatsapp' && <MessageSquare className="w-5 h-5 text-emerald-600" />}
                {actionType === 'voice' && <PhoneCall className="w-5 h-5 text-royal-600" />}
                {actionType === 'email' && <Mail className="w-5 h-5 text-brand-600" />}
                {actionType === 'promise' && <CalendarCheck className="w-5 h-5 text-amber-600" />}
                <h3 className="font-bold text-slate-900 text-base">
                  {actionType === 'promise' ? 'Record Payment Promise' : `Dispatch ${actionType.toUpperCase()} Follow-up`}
                </h3>
              </div>
              <button
                onClick={() => {
                  setActionType(null);
                  setSelectedItem(null);
                }}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-200">
              <p>
                <strong>Customer:</strong> {selectedItem.company_name} ({selectedItem.contact_person})
              </p>
              <p className="mt-1">
                <strong>Invoice:</strong> {selectedItem.invoice_number} • Outstanding:{' '}
                <span className="font-bold text-rose-600">{formatCurrency(selectedItem.remaining_amount)}</span>
              </p>
            </div>

            {actionType === 'promise' ? (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Promised Amount (₹)</label>
                  <input
                    type="number"
                    value={promisedAmount}
                    onChange={(e) => setPromisedAmount(Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Promised Payment Date</label>
                  <input
                    type="date"
                    value={promisedDate}
                    onChange={(e) => setPromisedDate(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Customer Commitment Notes</label>
                  <textarea
                    rows={2}
                    value={promiseNotes}
                    onChange={(e) => setPromiseNotes(e.target.value)}
                    placeholder="e.g. Spoke to Director, said RTGS scheduled for Wednesday"
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl"
                  />
                </div>
              </div>
            ) : actionType === 'voice' ? (
              <div className="space-y-3">
                <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl text-xs text-royal-900 leading-relaxed">
                  <strong>AI Voice Call Simulation (Section 11):</strong>
                  <p className="mt-1">
                    "Hello, this is an automated payment assistant calling on behalf of Apex Industrial... Could you please let us know when we can expect the payment?"
                  </p>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Test Simulated Customer Response:</label>
                  <select
                    value={voiceIntent}
                    onChange={(e: any) => setVoiceIntent(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl bg-white"
                  >
                    <option value="will_pay_soon">"I will pay tomorrow via RTGS" (Auto-creates Promise)</option>
                    <option value="already_paid">"I have already paid via NEFT" (Creates Verification Task)</option>
                    <option value="call_back_later">"Call me back later tomorrow" (Reschedules Task)</option>
                    <option value="dispute_raised">"Price discrepancy on bill" (Flags Dispute & Pauses Reminders)</option>
                    <option value="human_request">"Connect me to human credit head" (Alerts Rajesh)</option>
                  </select>
                </div>
              </div>
            ) : (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Editable Message Body</label>
                <textarea
                  rows={6}
                  value={actionMessage}
                  onChange={(e) => setActionMessage(e.target.value)}
                  className="w-full p-3 text-xs font-mono bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-brand-500/20"
                />
              </div>
            )}

            <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
              <button
                onClick={() => {
                  setActionType(null);
                  setSelectedItem(null);
                }}
                disabled={executing}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleExecuteAction}
                disabled={executing}
                className="px-4 py-2 text-xs font-semibold bg-navy-900 hover:bg-navy-800 text-white rounded-xl transition-colors flex items-center gap-1.5 disabled:opacity-50"
              >
                {executing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                <span>{actionType === 'promise' ? 'Save Promise' : `Dispatch ${actionType.toUpperCase()}`}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
