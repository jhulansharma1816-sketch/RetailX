import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  ShieldAlert,
  RefreshCw,
  X,
  Loader2,
  FileText,
} from 'lucide-react';
import { api } from '../services/api';
import { Dispute, Customer, Invoice } from '../types';

export const DisputesPage: React.FC = () => {
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');

  // Raise Dispute Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [customerId, setCustomerId] = useState('');
  const [invoiceId, setInvoiceId] = useState('');
  const [category, setCategory] = useState('pricing_error');
  const [disputedAmount, setDisputedAmount] = useState<number>(0);
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  // Resolve Modal
  const [selectedDispute, setSelectedDispute] = useState<Dispute | null>(null);
  const [resolveStatus, setResolveStatus] = useState<string>('resolved');
  const [resolutionNotes, setResolutionNotes] = useState('');

  const [notification, setNotification] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [dRes, cRes, iRes] = await Promise.all([
        api.getDisputes({ status: statusFilter === 'all' ? undefined : statusFilter }),
        api.getCustomers(),
        api.getInvoices({ status: 'all' }),
      ]);
      setDisputes(dRes);
      setCustomers(cRes);
      setInvoices(iRes);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [statusFilter]);

  const openRaiseModal = () => {
    const firstCust = customers[0]?.id || '';
    setCustomerId(firstCust);
    const custInvs = invoices.filter((i) => i.customer_id === firstCust);
    if (custInvs[0]) {
      setInvoiceId(custInvs[0].id);
      setDisputedAmount(custInvs[0].remaining_amount);
    }
    setCategory('pricing_error');
    setDescription('Rate charged on line item does not match purchase order agreed pricing.');
    setIsModalOpen(true);
  };

  const handleRaiseDispute = async () => {
    if (!customerId || !invoiceId || disputedAmount <= 0 || !description) {
      alert('Please fill mandatory dispute fields.');
      return;
    }
    setSaving(true);
    try {
      const res = await api.raiseDispute({
        customer_id: customerId,
        invoice_id: invoiceId,
        category,
        description,
        disputed_amount: disputedAmount,
      });
      setNotification(`Dispute raised on invoice! Reminders paused.`);
      setIsModalOpen(false);
      loadData();
      setTimeout(() => setNotification(null), 5000);
    } catch (e: any) {
      alert(`Error: ${e.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleResolveDispute = async () => {
    if (!selectedDispute) return;
    setSaving(true);
    try {
      await api.updateDispute(selectedDispute.id, {
        status: resolveStatus,
        resolution_notes: resolutionNotes || 'Dispute reviewed and resolved.',
      });
      setNotification(`Dispute marked as ${resolveStatus}. Invoice reminders restored.`);
      setSelectedDispute(null);
      loadData();
      setTimeout(() => setNotification(null), 5000);
    } catch (e: any) {
      alert(`Error: ${e.message}`);
    } finally {
      setSaving(false);
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(val);
  };

  const eligibleInvoices = invoices.filter((i) => i.customer_id === customerId);

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
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Invoice Dispute Management</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Log and review customer invoice disputes, damaged goods claims, or rate mismatches while safely pausing automated reminders.
          </p>
        </div>
        <button
          onClick={openRaiseModal}
          className="px-4 py-2 bg-navy-900 hover:bg-navy-800 text-white text-xs font-semibold rounded-xl shadow-sm flex items-center gap-1.5 transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Raise Dispute</span>
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
        {[
          { id: 'all', label: `All Disputes (${disputes.length})` },
          { id: 'open', label: `Open (${disputes.filter((d) => d.status === 'open').length})` },
          { id: 'under_review', label: `Under Review (${disputes.filter((d) => d.status === 'under_review').length})` },
          { id: 'resolved', label: `Resolved (${disputes.filter((d) => d.status === 'resolved').length})` },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setStatusFilter(tab.id)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              statusFilter === tab.id
                ? 'bg-navy-900 text-white shadow-xs'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Disputes Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {loading ? (
          <div className="col-span-full py-12 text-center text-slate-400">
            <RefreshCw className="w-5 h-5 animate-spin mx-auto text-brand-600 mb-2" />
            <span>Loading disputes...</span>
          </div>
        ) : disputes.length === 0 ? (
          <div className="col-span-full py-12 text-center text-slate-400 bg-white rounded-2xl border border-slate-200">
            No disputes found matching this filter.
          </div>
        ) : (
          disputes.map((dsp) => {
            const isResolved = dsp.status === 'resolved';
            const isOpen = dsp.status === 'open';

            return (
              <div
                key={dsp.id}
                className="bg-white rounded-2xl p-5 border border-slate-200 shadow-card hover:shadow-card-hover transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span
                      className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border uppercase ${
                        isResolved
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-purple-50 text-purple-700 border-purple-200'
                      }`}
                    >
                      {dsp.status.replace('_', ' ')}
                    </span>
                    <span className="text-xs font-bold text-slate-500">{dsp.dispute_number}</span>
                  </div>

                  <h3 className="font-bold text-slate-900 text-sm">{dsp.company_name}</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Invoice: <span className="font-semibold text-slate-800">{dsp.invoice_number}</span> • Category:{' '}
                    <span className="font-semibold text-purple-700 uppercase">{dsp.category.replace('_', ' ')}</span>
                  </p>

                  <div className="my-3 p-3 bg-purple-50/50 rounded-xl border border-purple-100 flex items-center justify-between">
                    <span className="text-xs text-purple-900 font-medium">Disputed Amount</span>
                    <span className="text-base font-bold text-purple-900">{formatCurrency(dsp.disputed_amount)}</span>
                  </div>

                  <p className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100 leading-relaxed">
                    "{dsp.description}"
                  </p>

                  {dsp.resolution_notes && (
                    <div className="mt-2 text-xs text-emerald-800 bg-emerald-50/70 p-2.5 rounded-xl border border-emerald-200">
                      <strong>Resolution Notes:</strong> {dsp.resolution_notes}
                    </div>
                  )}
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[11px] text-slate-400">
                    Logged: {new Date(dsp.created_at).toLocaleDateString()}
                  </span>
                  {!isResolved && (
                    <button
                      onClick={() => {
                        setSelectedDispute(dsp);
                        setResolveStatus('resolved');
                        setResolutionNotes('');
                      }}
                      className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors"
                    >
                      Resolve / Review
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Raise Dispute Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-elevated w-full max-w-lg p-6 border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-base">Raise Invoice Dispute</h3>
              <button onClick={() => setIsModalOpen(false)} className="p-1 rounded-lg text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Customer</label>
                <select
                  value={customerId}
                  onChange={(e) => {
                    setCustomerId(e.target.value);
                    const custInvs = invoices.filter((i) => i.customer_id === e.target.value);
                    if (custInvs[0]) {
                      setInvoiceId(custInvs[0].id);
                      setDisputedAmount(custInvs[0].remaining_amount);
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
                <label className="block text-xs font-semibold text-slate-700 mb-1">Invoice</label>
                <select
                  value={invoiceId}
                  onChange={(e) => {
                    setInvoiceId(e.target.value);
                    const inv = invoices.find((i) => i.id === e.target.value);
                    if (inv) setDisputedAmount(inv.remaining_amount);
                  }}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl bg-white"
                >
                  {eligibleInvoices.map((inv) => (
                    <option key={inv.id} value={inv.id}>
                      {inv.invoice_number} (Total: {formatCurrency(inv.total_amount)})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Dispute Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl bg-white"
                  >
                    <option value="pricing_error">Pricing Error / Rate Mismatch</option>
                    <option value="damaged_goods">Damaged Goods on Delivery</option>
                    <option value="short_shipment">Short Shipment / Missing Units</option>
                    <option value="tax_mismatch">GSTIN / Tax Mismatch</option>
                    <option value="already_paid">Customer Claims Already Paid</option>
                    <option value="other">Other Commercial Dispute</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Disputed Amount (₹)</label>
                  <input
                    type="number"
                    value={disputedAmount}
                    onChange={(e) => setDisputedAmount(Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Description / Customer Claim</label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Detail the dispute claim from the customer..."
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl"
                />
              </div>

              <p className="text-[11px] text-purple-700 bg-purple-50 p-2.5 rounded-lg border border-purple-200">
                ℹ️ Raising a dispute immediately pauses automated WhatsApp, SMS, and Voice reminders for this invoice.
              </p>
            </div>

            <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={handleRaiseDispute}
                disabled={saving}
                className="px-4 py-2 text-xs font-semibold bg-navy-900 hover:bg-navy-800 text-white rounded-xl"
              >
                Raise Dispute & Pause Reminders
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Resolve Dispute Modal */}
      {selectedDispute && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-elevated w-full max-w-md p-6 border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-base">Resolve / Review Dispute</h3>
              <button onClick={() => setSelectedDispute(null)} className="p-1 rounded-lg text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Status</label>
                <select
                  value={resolveStatus}
                  onChange={(e) => setResolveStatus(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl bg-white"
                >
                  <option value="resolved">Resolved (Agreed & Closed)</option>
                  <option value="under_review">Under Review (Checking with Warehouse / Sales)</option>
                  <option value="awaiting_customer">Awaiting Customer Supporting Docs</option>
                  <option value="rejected">Rejected (Claim Invalid, Reminders Resume)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Resolution Notes</label>
                <textarea
                  rows={3}
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  placeholder="e.g. Credit note of ₹8,800 issued. Remaining balance confirmed with buyer."
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl"
                />
              </div>
            </div>

            <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
              <button
                onClick={() => setSelectedDispute(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={handleResolveDispute}
                disabled={saving}
                className="px-4 py-2 text-xs font-semibold bg-navy-900 hover:bg-navy-800 text-white rounded-xl"
              >
                Save Resolution
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
