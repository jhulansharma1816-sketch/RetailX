import React, { useEffect, useState } from 'react';
import {
  CalendarCheck,
  Plus,
  Search,
  CheckCircle2,
  AlertTriangle,
  Clock,
  RotateCcw,
  RefreshCw,
  X,
  Loader2,
} from 'lucide-react';
import { api } from '../services/api';
import { PaymentPromise, Customer, Invoice } from '../types';

export const PaymentPromisesPage: React.FC = () => {
  const [promises, setPromises] = useState<PaymentPromise[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');

  // New Promise Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [customerId, setCustomerId] = useState('');
  const [invoiceId, setInvoiceId] = useState('');
  const [amount, setAmount] = useState<number>(0);
  const [promisedDate, setPromisedDate] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  // Status Modal
  const [selectedPromise, setSelectedPromise] = useState<PaymentPromise | null>(null);
  const [newStatus, setNewStatus] = useState<string>('fulfilled');
  const [statusNotes, setStatusNotes] = useState('');
  const [rescheduledDate, setRescheduledDate] = useState('');

  const [notification, setNotification] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [pRes, cRes, iRes] = await Promise.all([
        api.getPromises({ status: statusFilter === 'all' ? undefined : statusFilter }),
        api.getCustomers(),
        api.getInvoices({ status: 'all' }),
      ]);
      setPromises(pRes);
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

  const openCreateModal = () => {
    const firstCust = customers[0]?.id || '';
    setCustomerId(firstCust);
    const custInvs = invoices.filter((i) => i.customer_id === firstCust && i.remaining_amount > 0);
    if (custInvs.length > 0) {
      setInvoiceId(custInvs[0].id);
      setAmount(custInvs[0].remaining_amount);
    } else {
      setInvoiceId('');
      setAmount(0);
    }
    const due = new Date();
    due.setDate(due.getDate() + 3);
    setPromisedDate(due.toISOString().split('T')[0]);
    setNotes('Customer committed to transfer funds after client project clearance.');
    setIsModalOpen(true);
  };

  const handleSavePromise = async () => {
    if (!customerId || !invoiceId || amount <= 0 || !promisedDate) {
      alert('Please fill all mandatory fields.');
      return;
    }
    setSaving(true);
    try {
      await api.recordPromise({
        customer_id: customerId,
        invoice_id: invoiceId,
        promised_amount: amount,
        promised_date: promisedDate,
        commitment_notes: notes,
      });
      setNotification('Payment promise recorded!');
      setIsModalOpen(false);
      loadData();
      setTimeout(() => setNotification(null), 4000);
    } catch (e: any) {
      alert(`Error: ${e.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateStatus = async () => {
    if (!selectedPromise) return;
    setSaving(true);
    try {
      await api.updatePromiseStatus(selectedPromise.id, {
        status: newStatus,
        notes: statusNotes,
        rescheduled_date: newStatus === 'rescheduled' ? rescheduledDate : undefined,
      });
      setNotification(`Promise marked as ${newStatus}!`);
      setSelectedPromise(null);
      loadData();
      setTimeout(() => setNotification(null), 4000);
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

  const eligibleInvoices = invoices.filter(
    (i) => i.customer_id === customerId && i.remaining_amount > 0
  );

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
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Payment Promises (PTP)</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Track commitments to pay, automatically detect missed promises, and escalate recovery workflows.
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="px-4 py-2 bg-navy-900 hover:bg-navy-800 text-white text-xs font-semibold rounded-xl shadow-sm flex items-center gap-1.5 transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Record Promise</span>
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
        {[
          { id: 'all', label: `All Promises (${promises.length})` },
          { id: 'pending', label: `Pending (${promises.filter((p) => p.status === 'pending').length})` },
          { id: 'missed', label: `Missed (${promises.filter((p) => p.status === 'missed').length})` },
          { id: 'fulfilled', label: `Fulfilled (${promises.filter((p) => p.status === 'fulfilled').length})` },
          { id: 'rescheduled', label: `Rescheduled (${promises.filter((p) => p.status === 'rescheduled').length})` },
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

      {/* Promises Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-full py-12 text-center text-slate-400">
            <RefreshCw className="w-5 h-5 animate-spin mx-auto text-brand-600 mb-2" />
            <span>Scanning payment commitments...</span>
          </div>
        ) : promises.length === 0 ? (
          <div className="col-span-full py-12 text-center text-slate-400 bg-white rounded-2xl border border-slate-200">
            No payment promises found for this filter.
          </div>
        ) : (
          promises.map((p) => {
            const isMissed = p.status === 'missed';
            const isFulfilled = p.status === 'fulfilled';
            const isPending = p.status === 'pending';

            const badgeBg = isMissed
              ? 'bg-rose-50 text-rose-700 border-rose-200'
              : isFulfilled
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
              : 'bg-amber-50 text-amber-700 border-amber-200';

            return (
              <div
                key={p.id}
                className="bg-white rounded-2xl p-5 border border-slate-200 shadow-card hover:shadow-card-hover transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase ${badgeBg}`}>
                      {p.status}
                    </span>
                    <span className="text-xs font-semibold text-slate-500">
                      Promised Date: <span className="font-bold text-slate-800">{p.promised_date}</span>
                    </span>
                  </div>

                  <h3 className="font-bold text-slate-900 text-sm leading-tight truncate">
                    {p.company_name}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Invoice: <span className="font-semibold text-slate-700">{p.invoice_number}</span>
                  </p>

                  <div className="my-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-[11px] text-slate-400 block font-medium">Promised Commitment</span>
                    <span className="text-lg font-bold text-navy-900">{formatCurrency(p.promised_amount)}</span>
                  </div>

                  {p.commitment_notes && (
                    <p className="text-xs text-slate-600 italic bg-slate-50/50 p-2.5 rounded-lg border border-slate-100 line-clamp-2">
                      "{p.commitment_notes}"
                    </p>
                  )}
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[11px] text-slate-400">
                    {p.fulfilled_at ? `Fulfilled on ${new Date(p.fulfilled_at).toLocaleDateString()}` : 'Awaiting transfer'}
                  </span>
                  <button
                    onClick={() => {
                      setSelectedPromise(p);
                      setNewStatus(p.status === 'pending' ? 'fulfilled' : p.status);
                    }}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors"
                  >
                    Update Status
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* New Promise Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-elevated w-full max-w-lg p-6 border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-base">Record Payment Commitment (Promise)</h3>
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
                    const custInvs = invoices.filter((i) => i.customer_id === e.target.value && i.remaining_amount > 0);
                    if (custInvs.length > 0) {
                      setInvoiceId(custInvs[0].id);
                      setAmount(custInvs[0].remaining_amount);
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
                <label className="block text-xs font-semibold text-slate-700 mb-1">Pending Invoice</label>
                <select
                  value={invoiceId}
                  onChange={(e) => {
                    setInvoiceId(e.target.value);
                    const inv = invoices.find((i) => i.id === e.target.value);
                    if (inv) setAmount(inv.remaining_amount);
                  }}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl bg-white"
                >
                  {eligibleInvoices.map((inv) => (
                    <option key={inv.id} value={inv.id}>
                      {inv.invoice_number} (Remaining: {formatCurrency(inv.remaining_amount)})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Promised Amount (₹)</label>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Promised Date</label>
                  <input
                    type="date"
                    value={promisedDate}
                    onChange={(e) => setPromisedDate(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Commitment Notes</label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Director confirmed via telephone call"
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl"
                />
              </div>
            </div>

            <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
              <button
                onClick={() => setIsModalOpen(false)}
                disabled={saving}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={handleSavePromise}
                disabled={saving || eligibleInvoices.length === 0}
                className="px-4 py-2 text-xs font-semibold bg-navy-900 hover:bg-navy-800 text-white rounded-xl flex items-center gap-1.5 disabled:opacity-50"
              >
                {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Save Promise</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Update Promise Status Modal */}
      {selectedPromise && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-elevated w-full max-w-md p-6 border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-base">Update Commitment Status</h3>
              <button onClick={() => setSelectedPromise(null)} className="p-1 rounded-lg text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-200">
              <p><strong>Customer:</strong> {selectedPromise.company_name}</p>
              <p className="mt-1"><strong>Invoice:</strong> {selectedPromise.invoice_number} ({formatCurrency(selectedPromise.promised_amount)})</p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Status</label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl bg-white"
                >
                  <option value="fulfilled">Fulfilled (Payment Cleared)</option>
                  <option value="missed">Missed (Escalate to Recovery Assistant)</option>
                  <option value="rescheduled">Rescheduled (Customer requested date extension)</option>
                  <option value="pending">Pending</option>
                </select>
              </div>

              {newStatus === 'rescheduled' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">New Promised Date</label>
                  <input
                    type="date"
                    value={rescheduledDate}
                    onChange={(e) => setRescheduledDate(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Update Notes</label>
                <textarea
                  rows={2}
                  value={statusNotes}
                  onChange={(e) => setStatusNotes(e.target.value)}
                  placeholder="e.g. Cleared via RTGS today"
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl"
                />
              </div>
            </div>

            <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
              <button
                onClick={() => setSelectedPromise(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateStatus}
                disabled={saving}
                className="px-4 py-2 text-xs font-semibold bg-navy-900 hover:bg-navy-800 text-white rounded-xl"
              >
                Update Status
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
