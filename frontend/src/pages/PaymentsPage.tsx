import React, { useEffect, useState } from 'react';
import {
  CreditCard,
  Plus,
  Search,
  CheckCircle2,
  RefreshCw,
  X,
  Loader2,
  DollarSign,
  Calendar,
  Building2,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { api } from '../services/api';
import { Payment, Customer, Invoice } from '../types';

export const PaymentsPage: React.FC = () => {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Record Payment Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [selectedInvoiceId, setSelectedInvoiceId] = useState('');
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentMethod, setPaymentMethod] = useState('bank_transfer');
  const [txRef, setTxRef] = useState('');
  const [notes, setNotes] = useState('');
  const [recording, setRecording] = useState(false);

  const [notification, setNotification] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [payRes, custRes, invRes] = await Promise.all([
        api.getPayments(),
        api.getCustomers(),
        api.getInvoices({ status: 'all' }),
      ]);
      setPayments(payRes);
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
  }, []);

  const openRecordModal = () => {
    const firstCust = customers[0]?.id || '';
    setSelectedCustomerId(firstCust);
    const custInvs = invoices.filter((i) => i.customer_id === firstCust && i.remaining_amount > 0);
    const firstInv = custInvs[0];
    if (firstInv) {
      setSelectedInvoiceId(firstInv.id);
      setPaymentAmount(firstInv.remaining_amount);
    } else {
      setSelectedInvoiceId('');
      setPaymentAmount(0);
    }
    setPaymentDate(new Date().toISOString().split('T')[0]);
    setPaymentMethod('bank_transfer');
    setTxRef(`NEFT/HDFC/${Math.floor(100000 + Math.random() * 900000)}`);
    setNotes('Cleared via online transfer');
    setIsModalOpen(true);
  };

  const handleCustomerChange = (cid: string) => {
    setSelectedCustomerId(cid);
    const custInvs = invoices.filter((i) => i.customer_id === cid && i.remaining_amount > 0);
    if (custInvs.length > 0) {
      setSelectedInvoiceId(custInvs[0].id);
      setPaymentAmount(custInvs[0].remaining_amount);
    } else {
      setSelectedInvoiceId('');
      setPaymentAmount(0);
    }
  };

  const handleInvoiceChange = (iid: string) => {
    setSelectedInvoiceId(iid);
    const inv = invoices.find((i) => i.id === iid);
    if (inv) {
      setPaymentAmount(inv.remaining_amount);
    }
  };

  const handleRecordPayment = async () => {
    if (!selectedCustomerId || !selectedInvoiceId || paymentAmount <= 0) {
      alert('Please select an invoice and enter a valid positive payment amount.');
      return;
    }

    const currentInv = invoices.find((i) => i.id === selectedInvoiceId);
    if (currentInv && paymentAmount > currentInv.remaining_amount) {
      alert(`Payment amount (₹${paymentAmount}) cannot exceed remaining balance (₹${currentInv.remaining_amount}).`);
      return;
    }

    setRecording(true);
    try {
      const res = await api.recordPayment({
        customer_id: selectedCustomerId,
        invoice_id: selectedInvoiceId,
        amount: paymentAmount,
        payment_date: paymentDate,
        payment_method: paymentMethod,
        transaction_reference: txRef,
        notes: notes,
      });

      // Celebration confetti if fully paid
      if (res.invoice_status === 'paid') {
        confetti({
          particleCount: 80,
          spread: 60,
          origin: { y: 0.7 },
        });
      }

      setNotification(res.message);
      setIsModalOpen(false);
      loadData();
      setTimeout(() => setNotification(null), 5000);
    } catch (e: any) {
      alert(`Error recording payment: ${e.message}`);
    } finally {
      setRecording(false);
    }
  };

  const eligibleInvoices = invoices.filter(
    (i) => i.customer_id === selectedCustomerId && i.remaining_amount > 0
  );

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(val);
  };

  const filteredPayments = payments.filter((p) => {
    const s = searchTerm.toLowerCase();
    return (
      (p.company_name && p.company_name.toLowerCase().includes(s)) ||
      (p.payment_number && p.payment_number.toLowerCase().includes(s)) ||
      (p.transaction_reference && p.transaction_reference.toLowerCase().includes(s)) ||
      (p.invoice_number && p.invoice_number.toLowerCase().includes(s))
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
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Payment Receipts & Reconciliation</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Record partial or full collections, update invoice balances automatically, and prevent accidental overpayment.
          </p>
        </div>
        <button
          onClick={openRecordModal}
          className="px-4 py-2 bg-navy-900 hover:bg-navy-800 text-white text-xs font-semibold rounded-xl shadow-sm flex items-center gap-1.5 transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Record Payment</span>
        </button>
      </div>

      {/* Search */}
      <div className="relative w-full sm:w-80">
        <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search receipt, buyer, UTR / reference..."
          className="w-full pl-9 pr-4 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200 uppercase tracking-wider">
              <tr>
                <th className="py-3.5 px-4">Receipt #</th>
                <th className="py-3.5 px-4">Customer Name</th>
                <th className="py-3.5 px-4">Invoice #</th>
                <th className="py-3.5 px-4">Date</th>
                <th className="py-3.5 px-4">Payment Method</th>
                <th className="py-3.5 px-4">Reference / UTR</th>
                <th className="py-3.5 px-4 text-right">Amount Received</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto text-brand-600 mb-2" />
                    <span>Loading payment history...</span>
                  </td>
                </tr>
              ) : filteredPayments.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    No payment records found.
                  </td>
                </tr>
              ) : (
                filteredPayments.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-slate-900">{p.payment_number}</td>
                    <td className="py-3.5 px-4 font-medium text-slate-800">{p.company_name}</td>
                    <td className="py-3.5 px-4 text-slate-600 font-semibold">{p.invoice_number}</td>
                    <td className="py-3.5 px-4 text-slate-500">{p.payment_date}</td>
                    <td className="py-3.5 px-4">
                      <span className="inline-block px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[10px] font-bold uppercase">
                        {p.payment_method.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-500 font-mono text-[11px]">
                      {p.transaction_reference || 'N/A'}
                    </td>
                    <td className="py-3.5 px-4 text-right font-bold text-emerald-600 text-sm">
                      +{formatCurrency(p.amount)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Record Payment Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-elevated w-full max-w-lg p-6 border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-base">Record Payment Receipt</h3>
              <button onClick={() => setIsModalOpen(false)} className="p-1 rounded-lg text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Select Customer</label>
                <select
                  value={selectedCustomerId}
                  onChange={(e) => handleCustomerChange(e.target.value)}
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
                <label className="block text-xs font-semibold text-slate-700 mb-1">Select Pending Invoice</label>
                {eligibleInvoices.length === 0 ? (
                  <p className="text-xs text-rose-600 font-medium p-2 bg-rose-50 rounded-lg">
                    This customer has no active unpaid invoices.
                  </p>
                ) : (
                  <select
                    value={selectedInvoiceId}
                    onChange={(e) => handleInvoiceChange(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl bg-white"
                  >
                    {eligibleInvoices.map((inv) => (
                      <option key={inv.id} value={inv.id}>
                        {inv.invoice_number} — Remaining: {formatCurrency(inv.remaining_amount)} (Due: {inv.due_date})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Payment Amount (₹)</label>
                  <input
                    type="number"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Payment Date</label>
                  <input
                    type="date"
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Payment Method</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl bg-white"
                  >
                    <option value="bank_transfer">Bank Transfer (NEFT/RTGS)</option>
                    <option value="upi">UPI Transfer</option>
                    <option value="cheque">Cheque</option>
                    <option value="cash">Cash</option>
                    <option value="card">Credit/Debit Card</option>
                    <option value="online">Online Payment Gateway</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Reference / UTR #</label>
                  <input
                    type="text"
                    value={txRef}
                    onChange={(e) => setTxRef(e.target.value)}
                    placeholder="e.g. UTR192082910"
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Notes</label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Part payment received, balance next week"
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl"
                />
              </div>
            </div>

            <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
              <button
                onClick={() => setIsModalOpen(false)}
                disabled={recording}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={handleRecordPayment}
                disabled={recording || eligibleInvoices.length === 0}
                className="px-4 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl flex items-center gap-1.5 disabled:opacity-50"
              >
                {recording && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Record Payment & Update Balance</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
