import React, { useEffect, useState } from 'react';
import {
  PhoneCall,
  Play,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Sparkles,
  RefreshCw,
  PhoneForwarded,
  ShieldAlert,
  Loader2,
  CalendarCheck,
} from 'lucide-react';
import { api } from '../services/api';
import { Customer, Invoice } from '../types';

export const VoiceCallsPage: React.FC = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

  // Call simulation state
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [selectedInvoiceId, setSelectedInvoiceId] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [simulatedIntent, setSimulatedIntent] = useState<'will_pay_soon' | 'already_paid' | 'call_back_later' | 'dispute_raised' | 'human_request'>('will_pay_soon');
  const [calling, setCalling] = useState(false);
  const [callResult, setCallResult] = useState<any>(null);

  const [notification, setNotification] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [cRes, iRes] = await Promise.all([
        api.getCustomers(),
        api.getInvoices({ status: 'all' }),
      ]);
      setCustomers(cRes);
      setInvoices(iRes);
      if (cRes.length > 0) {
        setSelectedCustomerId(cRes[0].id);
        setPhoneNumber(cRes[0].phone);
        const custInvs = iRes.filter((i) => i.customer_id === cRes[0].id && i.remaining_amount > 0);
        if (custInvs[0]) setSelectedInvoiceId(custInvs[0].id);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCustomerChange = (cid: string) => {
    setSelectedCustomerId(cid);
    const cust = customers.find((c) => c.id === cid);
    if (cust) setPhoneNumber(cust.phone);
    const custInvs = invoices.filter((i) => i.customer_id === cid && i.remaining_amount > 0);
    if (custInvs[0]) setSelectedInvoiceId(custInvs[0].id);
  };

  const handleInitiateCall = async () => {
    if (!selectedCustomerId || !phoneNumber) {
      alert('Please select a customer.');
      return;
    }
    setCalling(true);
    setCallResult(null);
    try {
      const res = await api.makeVoiceCall({
        customer_id: selectedCustomerId,
        invoice_id: selectedInvoiceId || undefined,
        phone_number: phoneNumber,
        simulated_intent: simulatedIntent,
      });
      setCallResult(res);
      setNotification('AI Voice Call successfully simulated and recorded!');
      setTimeout(() => setNotification(null), 5000);
    } catch (e: any) {
      alert(`Call failed: ${e.message}`);
    } finally {
      setCalling(false);
    }
  };

  const selectedInv = invoices.find((i) => i.id === selectedInvoiceId);

  return (
    <div className="space-y-6">
      {/* Toast */}
      {notification && (
        <div className="p-4 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center justify-between animate-fadeIn shadow-sm">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            <span className="text-sm font-medium">{notification}</span>
          </div>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-gradient-to-r from-navy-950 via-navy-900 to-royal-800 rounded-2xl p-6 text-white shadow-elevated">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/10 text-teal-300 text-xs font-semibold rounded-full border border-white/20 mb-2">
          <PhoneCall className="w-3.5 h-3.5" />
          <span>AI Telephony Follow-up Engine (Section 11)</span>
        </div>
        <h2 className="text-xl md:text-2xl font-bold tracking-tight">
          Automated AI Voice Call Recovery Assistant
        </h2>
        <p className="text-slate-300 text-xs md:text-sm mt-1 max-w-2xl leading-relaxed">
          Place polite, compliant automated follow-up calls to debtors with clear AI disclosure upfront. The assistant understands customer responses and automatically records payment commitments or flags disputes.
        </p>
      </div>

      {/* Interactive Simulator Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Call Configurator */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-card space-y-4">
          <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-brand-600" />
            <span>Schedule / Initiate Voice Call</span>
          </h3>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Target Debtor</label>
              <select
                value={selectedCustomerId}
                onChange={(e) => handleCustomerChange(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl bg-white"
              >
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.company_name} ({c.contact_person})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Target Invoice</label>
              <select
                value={selectedInvoiceId}
                onChange={(e) => setSelectedInvoiceId(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl bg-white"
              >
                {invoices
                  .filter((i) => i.customer_id === selectedCustomerId && i.remaining_amount > 0)
                  .map((inv) => (
                    <option key={inv.id} value={inv.id}>
                      {inv.invoice_number} — Remaining: ₹{inv.remaining_amount.toLocaleString('en-IN')} (Due: {inv.due_date})
                    </option>
                  ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Debtor Phone Number</label>
              <input
                type="text"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Simulated Customer Response Intent (Demo Mode)
              </label>
              <select
                value={simulatedIntent}
                onChange={(e: any) => setSimulatedIntent(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl bg-white font-medium"
              >
                <option value="will_pay_soon">"I will pay tomorrow via RTGS" (Records Commitment)</option>
                <option value="already_paid">"I have already paid via NEFT" (Triggers Verification Task)</option>
                <option value="call_back_later">"I'm driving, call me back later" (Reschedules Task)</option>
                <option value="dispute_raised">"Pricing mismatch on line items" (Flags Dispute)</option>
                <option value="human_request">"Connect me to human credit director" (Human Escalation)</option>
              </select>
            </div>

            {/* Regulatory Disclaimer Box */}
            <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl text-xs text-amber-900 leading-relaxed">
              <strong>Compliance Notice:</strong> Calls disclose AI identity, adhere to Indian TRAI calling hours (09:00 - 19:00), never harass debtors, and allow 1-click human escalation.
            </div>

            <button
              onClick={handleInitiateCall}
              disabled={calling}
              className="w-full py-3 bg-royal-700 hover:bg-royal-800 text-white font-semibold text-sm rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {calling ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 fill-white" />}
              <span>{calling ? 'Connecting Call Simulator...' : 'Initiate AI Call Simulation'}</span>
            </button>
          </div>
        </div>

        {/* Right: Live Call Transcript & Triggered Workflow Result */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-card flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="font-bold text-slate-900 text-base">Call Transcript & Automated Actions</h3>
              {callResult && (
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 uppercase">
                  {callResult.status} ({callResult.duration_seconds}s)
                </span>
              )}
            </div>

            {!callResult && !calling && (
              <div className="py-20 text-center text-slate-400">
                <PhoneCall className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                <p className="text-sm font-medium text-slate-600">No active call session</p>
                <p className="text-xs text-slate-400 mt-1">
                  Select a debtor on the left and click 'Initiate AI Call' to preview speech synthesis and automated action triggers.
                </p>
              </div>
            )}

            {calling && (
              <div className="py-20 text-center text-slate-500">
                <Loader2 className="w-8 h-8 animate-spin mx-auto text-royal-600 mb-2" />
                <p className="text-sm font-semibold text-slate-800">Dialing debtor and synthesizing voice dialogue...</p>
                <p className="text-xs text-slate-400 mt-1">Processing speech recognition and response intent</p>
              </div>
            )}

            {callResult && (
              <div className="space-y-4 animate-fadeIn">
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 font-mono text-xs whitespace-pre-wrap leading-relaxed text-slate-800">
                  {callResult.transcript}
                </div>

                <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-xl text-xs space-y-1 text-emerald-950">
                  <span className="font-bold text-emerald-800 uppercase block tracking-wider text-[10px]">
                    Automatic Recovery Workflow Triggered:
                  </span>
                  <p className="font-semibold">{callResult.action_summary}</p>
                </div>
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-slate-100 text-[11px] text-slate-400 flex items-center justify-between">
            <span>Telephony Adapter: Twilio / Exotel Bridge</span>
            <span className="font-semibold text-teal-600">DEMO VERIFIED</span>
          </div>
        </div>
      </div>
    </div>
  );
};
