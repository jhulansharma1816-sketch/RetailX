import React, { useEffect, useState } from 'react';
import {
  MessageSquare,
  PhoneCall,
  Mail,
  Smartphone,
  PlayCircle,
  Search,
  Filter,
  CheckCircle2,
  RefreshCw,
  Send,
  Plus,
  X,
  Bot,
  AlertCircle,
} from 'lucide-react';
import { api } from '../services/api';
import { CommunicationLog, Customer, Invoice } from '../types';

export const CommunicationCenterPage: React.FC = () => {
  const [logs, setLogs] = useState<CommunicationLog[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [channelFilter, setChannelFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Dispatch Direct Reminder Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [channel, setChannel] = useState<'whatsapp' | 'sms' | 'email'>('whatsapp');
  const [customerId, setCustomerId] = useState('');
  const [invoiceId, setInvoiceId] = useState('');
  const [recipient, setRecipient] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  const [notification, setNotification] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [logRes, custRes, invRes] = await Promise.all([
        api.getCommunications({ channel: channelFilter === 'all' ? undefined : channelFilter }),
        api.getCustomers(),
        api.getInvoices({ status: 'all' }),
      ]);
      setLogs(logRes);
      setCustomers(custRes);
      setInvoices(invRes);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [channelFilter]);

  const openDispatchModal = () => {
    const firstCust = customers[0];
    if (firstCust) {
      setCustomerId(firstCust.id);
      setRecipient(firstCust.whatsapp_number || firstCust.phone);
      const custInvs = invoices.filter((i) => i.customer_id === firstCust.id && i.remaining_amount > 0);
      const firstInv = custInvs[0];
      if (firstInv) {
        setInvoiceId(firstInv.id);
        setMessage(`Hello ${firstCust.contact_person}, this is a payment reminder for invoice ${firstInv.invoice_number} (₹${firstInv.remaining_amount.toLocaleString('en-IN')}) due on ${firstInv.due_date}. Please let us know your expected payment timeline.`);
      }
    }
    setChannel('whatsapp');
    setSubject('Payment Follow-up Notice');
    setIsModalOpen(true);
  };

  const handleSendReminder = async () => {
    if (!customerId || !recipient || !message) {
      alert('Please fill recipient and message body.');
      return;
    }
    setSending(true);
    try {
      const payload = {
        customer_id: customerId,
        invoice_id: invoiceId || undefined,
        recipient: recipient,
        message: message,
        subject: subject,
      };

      if (channel === 'whatsapp') {
        await api.sendWhatsApp(payload);
        setNotification('WhatsApp message dispatched in DEMO MODE.');
      } else if (channel === 'sms') {
        await api.sendSMS(payload);
        setNotification('SMS reminder dispatched in DEMO MODE.');
      } else if (channel === 'email') {
        await api.sendEmail(payload);
        setNotification('Email reminder dispatched in DEMO MODE.');
      }

      setIsModalOpen(false);
      loadData();
      setTimeout(() => setNotification(null), 4000);
    } catch (e: any) {
      alert(`Error: ${e.message}`);
    } finally {
      setSending(false);
    }
  };

  const handleTriggerScheduler = async () => {
    try {
      const res = await api.runScheduler(true);
      setNotification(`Scheduler executed! ${res.dispatched_count} automated reminders triggered.`);
      loadData();
      setTimeout(() => setNotification(null), 5000);
    } catch (e: any) {
      alert(`Scheduler error: ${e.message}`);
    }
  };

  const filteredLogs = logs.filter((l) => {
    const s = searchTerm.toLowerCase();
    return (
      l.recipient.toLowerCase().includes(s) ||
      (l.company_name && l.company_name.toLowerCase().includes(s)) ||
      (l.message_body && l.message_body.toLowerCase().includes(s)) ||
      (l.subject_or_title && l.subject_or_title.toLowerCase().includes(s))
    );
  });

  return (
    <div className="space-y-6">
      {/* Toast */}
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

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Omnichannel Communication Hub</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Centralized timeline of all WhatsApp reminders, SMS, Emails, and AI Voice Calls across your debtors.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleTriggerScheduler}
            className="px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl border border-slate-200 shadow-2xs flex items-center gap-1.5 transition-colors"
            title="Execute configured automated reminder rules now"
          >
            <PlayCircle className="w-3.5 h-3.5 text-teal-600" />
            <span>Run Auto-Scheduler</span>
          </button>
          <button
            onClick={openDispatchModal}
            className="px-4 py-2 bg-navy-900 hover:bg-navy-800 text-white text-xs font-semibold rounded-xl shadow-sm flex items-center gap-1.5 transition-colors"
          >
            <Send className="w-4 h-4" />
            <span>Send Direct Reminder</span>
          </button>
        </div>
      </div>

      {/* Filter Tabs & Search */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          {[
            { id: 'all', label: 'All Channels' },
            { id: 'whatsapp', label: 'WhatsApp' },
            { id: 'sms', label: 'SMS' },
            { id: 'email', label: 'Email' },
            { id: 'voice_call', label: 'AI Voice Calls' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setChannelFilter(tab.id)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                channelFilter === tab.id
                  ? 'bg-navy-900 text-white shadow-xs'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search recipient or message content..."
            className="w-full pl-9 pr-4 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
          />
        </div>
      </div>

      {/* Log Feed */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-card divide-y divide-slate-100 overflow-hidden">
        {loading ? (
          <div className="py-12 text-center text-slate-400">
            <RefreshCw className="w-5 h-5 animate-spin mx-auto text-brand-600 mb-2" />
            <span>Retrieving communication history...</span>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="py-12 text-center text-slate-400">
            No communication records found for this filter.
          </div>
        ) : (
          filteredLogs.map((log) => {
            const isWhatsApp = log.channel === 'whatsapp';
            const isSMS = log.channel === 'sms';
            const isEmail = log.channel === 'email';
            const isVoice = log.channel === 'voice_call';

            const channelIcon = isWhatsApp ? (
              <MessageSquare className="w-4 h-4 text-emerald-600" />
            ) : isSMS ? (
              <Smartphone className="w-4 h-4 text-blue-600" />
            ) : isEmail ? (
              <Mail className="w-4 h-4 text-purple-600" />
            ) : (
              <PhoneCall className="w-4 h-4 text-royal-600" />
            );

            return (
              <div key={log.id} className="p-4 sm:p-5 hover:bg-slate-50/70 transition-colors">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="p-1.5 rounded-lg bg-slate-100">{channelIcon}</div>
                    <span className="font-bold text-slate-900 text-xs uppercase tracking-wide">
                      {log.channel.replace('_', ' ')}
                    </span>
                    <span className="text-xs font-semibold text-slate-700">• {log.company_name}</span>
                    {log.invoice_number && (
                      <span className="text-xs text-slate-400">({log.invoice_number})</span>
                    )}
                    {log.is_demo === 1 && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200 uppercase">
                        DEMO MODE
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-slate-400 font-medium">
                      {new Date(log.created_at).toLocaleString()}
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 uppercase">
                      {log.status}
                    </span>
                  </div>
                </div>

                <div className="pl-8 text-xs text-slate-700 space-y-1.5">
                  <p className="font-mono text-slate-500 text-[11px]">Recipient: {log.recipient}</p>
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80 font-mono text-[11px] whitespace-pre-wrap leading-relaxed">
                    {log.message_body}
                  </div>
                  {log.response_text && (
                    <div className="p-2.5 rounded-lg bg-emerald-50/70 border border-emerald-200 text-emerald-900 text-xs">
                      <strong>Customer Response:</strong> {log.response_text}
                    </div>
                  )}
                  {log.follow_up_action && (
                    <div className="text-[11px] font-semibold text-royal-700">
                      ⚡ Action: {log.follow_up_action}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Direct Reminder Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-elevated w-full max-w-lg p-6 border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-base">Dispatch Direct Payment Reminder</h3>
              <button onClick={() => setIsModalOpen(false)} className="p-1 rounded-lg text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Channel</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'whatsapp', label: 'WhatsApp', icon: MessageSquare },
                    { id: 'sms', label: 'SMS', icon: Smartphone },
                    { id: 'email', label: 'Email', icon: Mail },
                  ].map((ch) => {
                    const Icon = ch.icon;
                    return (
                      <button
                        key={ch.id}
                        type="button"
                        onClick={() => {
                          setChannel(ch.id as any);
                          const cust = customers.find((c) => c.id === customerId);
                          if (cust) {
                            setRecipient(ch.id === 'email' ? cust.email : cust.whatsapp_number || cust.phone);
                          }
                        }}
                        className={`p-2 rounded-xl text-xs font-semibold border flex items-center justify-center gap-1.5 transition-all ${
                          channel === ch.id
                            ? 'bg-navy-900 text-white border-navy-900'
                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5" />
                        <span>{ch.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Customer</label>
                <select
                  value={customerId}
                  onChange={(e) => {
                    setCustomerId(e.target.value);
                    const cust = customers.find((c) => c.id === e.target.value);
                    if (cust) {
                      setRecipient(channel === 'email' ? cust.email : cust.whatsapp_number || cust.phone);
                    }
                  }}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl bg-white"
                >
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.company_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Recipient Number / Email</label>
                <input
                  type="text"
                  value={recipient}
                  onChange={(e) => setRecipient(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl"
                />
              </div>

              {channel === 'email' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Subject</label>
                  <input
                    type="text"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Message Body</label>
                <textarea
                  rows={4}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-full p-3 text-xs border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-brand-500/20"
                />
              </div>
            </div>

            <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={handleSendReminder}
                disabled={sending}
                className="px-4 py-2 text-xs font-semibold bg-navy-900 hover:bg-navy-800 text-white rounded-xl flex items-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Dispatch Reminder</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
