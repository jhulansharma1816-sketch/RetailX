import React, { useEffect, useState } from 'react';
import {
  FileText,
  Plus,
  Upload,
  Download,
  Search,
  Filter,
  Trash2,
  Edit2,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  X,
  Loader2,
  FileSpreadsheet,
} from 'lucide-react';
import { api } from '../services/api';
import { Invoice, Customer } from '../types';

export const InvoicesPage: React.FC = () => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Create/Edit Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [customerId, setCustomerId] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [issueDate, setIssueDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState('');
  const [totalAmount, setTotalAmount] = useState<number>(0);
  const [taxAmount, setTaxAmount] = useState<number>(0);
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  // Import Modal
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importPreview, setImportPreview] = useState<any>(null);
  const [importing, setImporting] = useState(false);

  const [notification, setNotification] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [invRes, custRes] = await Promise.all([
        api.getInvoices({ status: statusFilter === 'all' ? undefined : statusFilter }),
        api.getCustomers(),
      ]);
      setInvoices(invRes);
      setCustomers(custRes);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [statusFilter]);

  const handleOpenCreate = () => {
    setEditingId(null);
    setCustomerId(customers[0]?.id || '');
    setInvoiceNumber(`INV-2026-${String(invoices.length + 101).padStart(3, '0')}`);
    setIssueDate(new Date().toISOString().split('T')[0]);
    const due = new Date();
    due.setDate(due.getDate() + 30);
    setDueDate(due.toISOString().split('T')[0]);
    setTotalAmount(50000);
    setTaxAmount(9000);
    setDescription('Industrial supplies batch order');
    setIsModalOpen(true);
  };

  const handleSaveInvoice = async () => {
    if (!customerId || !invoiceNumber || totalAmount <= 0 || !dueDate) {
      alert('Please fill all required fields with valid values.');
      return;
    }
    setSaving(true);
    try {
      if (editingId) {
        await api.updateInvoice(editingId, {
          customer_id: customerId,
          invoice_number: invoiceNumber,
          issue_date: issueDate,
          due_date: dueDate,
          total_amount: totalAmount,
          tax_amount: taxAmount,
          description: description,
        });
        setNotification(`Invoice ${invoiceNumber} updated successfully!`);
      } else {
        await api.createInvoice({
          customer_id: customerId,
          invoice_number: invoiceNumber,
          issue_date: issueDate,
          due_date: dueDate,
          total_amount: totalAmount,
          tax_amount: taxAmount,
          description: description,
        });
        setNotification(`Invoice ${invoiceNumber} created successfully!`);
      }
      setIsModalOpen(false);
      loadData();
      setTimeout(() => setNotification(null), 4000);
    } catch (e: any) {
      alert(`Error saving invoice: ${e.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteInvoice = async (inv: Invoice) => {
    if (inv.paid_amount > 0) {
      alert('Cannot delete invoice with recorded payments. Please void payments first.');
      return;
    }
    if (!confirm(`Are you sure you want to delete invoice ${inv.invoice_number}?`)) return;

    try {
      await api.deleteInvoice(inv.id);
      setNotification(`Invoice ${inv.invoice_number} deleted.`);
      loadData();
      setTimeout(() => setNotification(null), 4000);
    } catch (e: any) {
      alert(`Error: ${e.message}`);
    }
  };

  const handleFilePreview = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportFile(file);
    setImporting(true);
    try {
      const res = await api.importInvoices(file, false);
      setImportPreview(res);
    } catch (err: any) {
      alert(`Validation error: ${err.message}`);
    } finally {
      setImporting(false);
    }
  };

  const handleCommitImport = async () => {
    if (!importFile) return;
    setImporting(true);
    try {
      const res = await api.importInvoices(importFile, true);
      setNotification(`Successfully imported ${res.imported_count} invoices into the database!`);
      setIsImportOpen(false);
      setImportFile(null);
      setImportPreview(null);
      loadData();
      setTimeout(() => setNotification(null), 5000);
    } catch (err: any) {
      alert(`Import failed: ${err.message}`);
    } finally {
      setImporting(false);
    }
  };

  const filteredInvoices = invoices.filter((i) => {
    const s = searchTerm.toLowerCase();
    return (
      i.invoice_number.toLowerCase().includes(s) ||
      (i.company_name && i.company_name.toLowerCase().includes(s)) ||
      (i.description && i.description.toLowerCase().includes(s))
    );
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

      {/* Header & Primary Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Invoice Ledger</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage receivables, partial payment tracking, and automated overdue statuses.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <a
            href={api.exportInvoicesUrl}
            download
            className="px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl border border-slate-200 shadow-2xs flex items-center gap-1.5 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </a>
          <button
            onClick={() => setIsImportOpen(true)}
            className="px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl border border-slate-200 shadow-2xs flex items-center gap-1.5 transition-colors"
          >
            <Upload className="w-3.5 h-3.5 text-teal-600" />
            <span>Import Excel/CSV</span>
          </button>
          <button
            onClick={handleOpenCreate}
            className="px-4 py-2 bg-navy-900 hover:bg-navy-800 text-white text-xs font-semibold rounded-xl shadow-sm flex items-center gap-1.5 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Create Invoice</span>
          </button>
        </div>
      </div>

      {/* Search & Status Filters */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          {[
            { id: 'all', label: 'All Invoices' },
            { id: 'overdue', label: 'Overdue' },
            { id: 'sent', label: 'Sent / Due' },
            { id: 'partially_paid', label: 'Partially Paid' },
            { id: 'paid', label: 'Fully Paid' },
            { id: 'disputed', label: 'Disputed' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                statusFilter === tab.id
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
            placeholder="Search invoice number, buyer..."
            className="w-full pl-9 pr-4 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
          />
        </div>
      </div>

      {/* Invoices Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200 uppercase tracking-wider">
              <tr>
                <th className="py-3.5 px-4">Invoice #</th>
                <th className="py-3.5 px-4">Customer Name</th>
                <th className="py-3.5 px-4">Issue Date</th>
                <th className="py-3.5 px-4">Due Date</th>
                <th className="py-3.5 px-4 text-right">Total Amount</th>
                <th className="py-3.5 px-4 text-right">Paid</th>
                <th className="py-3.5 px-4 text-right">Remaining Balance</th>
                <th className="py-3.5 px-4 text-center">Status</th>
                <th className="py-3.5 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto text-brand-600 mb-2" />
                    <span>Loading invoice records...</span>
                  </td>
                </tr>
              ) : filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    No invoices matching current filter.
                  </td>
                </tr>
              ) : (
                filteredInvoices.map((inv) => {
                  const statusColors: any = {
                    paid: 'bg-emerald-50 text-emerald-700 border-emerald-200',
                    partially_paid: 'bg-blue-50 text-royal-700 border-blue-200',
                    overdue: 'bg-rose-50 text-rose-700 border-rose-200 font-semibold',
                    sent: 'bg-slate-100 text-slate-700 border-slate-200',
                    disputed: 'bg-purple-50 text-purple-700 border-purple-200 font-semibold',
                  };

                  return (
                    <tr key={inv.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-slate-900">{inv.invoice_number}</td>
                      <td className="py-3.5 px-4 font-medium text-slate-800">
                        {inv.company_name}
                        <span className="block text-[10px] text-slate-400">{inv.contact_person}</span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-500">{inv.issue_date}</td>
                      <td className="py-3.5 px-4 text-slate-500">{inv.due_date}</td>
                      <td className="py-3.5 px-4 text-right font-medium text-slate-700">
                        {formatCurrency(inv.total_amount)}
                      </td>
                      <td className="py-3.5 px-4 text-right text-emerald-600 font-medium">
                        {formatCurrency(inv.paid_amount)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-bold text-navy-900">
                        {formatCurrency(inv.remaining_amount)}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] uppercase font-bold border ${statusColors[inv.status] || 'bg-slate-100'}`}>
                          {inv.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => {
                              setEditingId(inv.id);
                              setCustomerId(inv.customer_id);
                              setInvoiceNumber(inv.invoice_number);
                              setIssueDate(inv.issue_date);
                              setDueDate(inv.due_date);
                              setTotalAmount(inv.total_amount);
                              setTaxAmount(inv.tax_amount);
                              setDescription(inv.description || '');
                              setIsModalOpen(true);
                            }}
                            className="p-1 text-slate-400 hover:text-slate-700 rounded-md hover:bg-slate-100"
                            title="Edit Invoice"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteInvoice(inv)}
                            className="p-1 text-slate-400 hover:text-rose-600 rounded-md hover:bg-rose-50"
                            title="Delete Invoice"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create / Edit Invoice Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-elevated w-full max-w-lg p-6 border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-base">
                {editingId ? 'Edit Invoice' : 'Create New B2B Invoice'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="p-1 rounded-lg text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Customer / Debtor</label>
                <select
                  value={customerId}
                  onChange={(e) => setCustomerId(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl bg-white"
                >
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.company_name} ({c.contact_person})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Invoice Number</label>
                  <input
                    type="text"
                    value={invoiceNumber}
                    onChange={(e) => setInvoiceNumber(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Total Amount (₹)</label>
                  <input
                    type="number"
                    value={totalAmount}
                    onChange={(e) => setTotalAmount(Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Issue Date</label>
                  <input
                    type="date"
                    value={issueDate}
                    onChange={(e) => setIssueDate(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Due Date</label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Description / Line Items</label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. Copper busbars, transformers batch #202"
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
                onClick={handleSaveInvoice}
                disabled={saving}
                className="px-4 py-2 text-xs font-semibold bg-navy-900 hover:bg-navy-800 text-white rounded-xl flex items-center gap-1.5"
              >
                {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>{editingId ? 'Update Invoice' : 'Save Invoice'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CSV / Excel Import Modal (Section 6) */}
      {isImportOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-elevated w-full max-w-2xl p-6 border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-teal-600" />
                <h3 className="font-bold text-slate-900 text-base">Import Invoices (Pandas Validation)</h3>
              </div>
              <button onClick={() => setIsImportOpen(false)} className="p-1 rounded-lg text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 bg-slate-50 border border-dashed border-slate-300 rounded-xl text-center">
              <input
                type="file"
                accept=".csv, .xlsx, .xls"
                onChange={handleFilePreview}
                id="file-upload"
                className="hidden"
              />
              <label htmlFor="file-upload" className="cursor-pointer block">
                <Upload className="w-8 h-8 mx-auto text-slate-400 mb-1" />
                <span className="text-sm font-semibold text-brand-600 hover:underline">
                  Choose CSV or Excel file (.csv, .xlsx)
                </span>
                <p className="text-xs text-slate-400 mt-1">
                  Supports columns: Company Name, Invoice Number, Amount, Due Date, Phone, Email
                </p>
              </label>
              {importFile && (
                <div className="mt-2 text-xs font-semibold text-slate-700 bg-white p-2 rounded-lg border border-slate-200 inline-block">
                  Selected: {importFile.name} ({(importFile.size / 1024).toFixed(1)} KB)
                </div>
              )}
            </div>

            {importing && (
              <div className="py-4 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-teal-600" />
                <span>Validating records with Python and Pandas...</span>
              </div>
            )}

            {/* Import Preview Diagnostics */}
            {importPreview && (
              <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="p-2 bg-emerald-50 text-emerald-800 rounded-lg font-semibold">
                    Valid Records: {importPreview.valid_count}
                  </div>
                  <div className="p-2 bg-rose-50 text-rose-800 rounded-lg font-semibold">
                    Errors: {importPreview.error_count}
                  </div>
                  <div className="p-2 bg-amber-50 text-amber-800 rounded-lg font-semibold">
                    Duplicates: {importPreview.duplicate_count}
                  </div>
                </div>

                {importPreview.duplicates?.length > 0 && (
                  <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl text-xs text-amber-900">
                    <strong>Duplicates detected (will not be re-imported):</strong>
                    <ul className="list-disc pl-4 mt-1 space-y-0.5">
                      {importPreview.duplicates.map((d: any, idx: number) => (
                        <li key={idx}>Row {d.row}: {d.invoice_number} ({d.reason})</li>
                      ))}
                    </ul>
                  </div>
                )}

                {importPreview.valid_records_preview?.length > 0 && (
                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <table className="w-full text-left text-[11px]">
                      <thead className="bg-slate-50 text-slate-500 font-semibold border-b">
                        <tr>
                          <th className="p-2">Customer</th>
                          <th className="p-2">Inv #</th>
                          <th className="p-2 text-right">Amount</th>
                          <th className="p-2">Due Date</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {importPreview.valid_records_preview.slice(0, 5).map((r: any, idx: number) => (
                          <tr key={idx}>
                            <td className="p-2 font-medium">{r.company_name}</td>
                            <td className="p-2 font-bold">{r.invoice_number}</td>
                            <td className="p-2 text-right font-medium">₹{r.total_amount?.toLocaleString('en-IN')}</td>
                            <td className="p-2 text-slate-500">{r.due_date}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
              <button
                onClick={() => setIsImportOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Close
              </button>
              {importPreview && importPreview.valid_count > 0 && (
                <button
                  onClick={handleCommitImport}
                  disabled={importing}
                  className="px-4 py-2 text-xs font-semibold bg-teal-600 hover:bg-teal-700 text-white rounded-xl flex items-center gap-1.5"
                >
                  {importing && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Commit Import ({importPreview.valid_count} Records)</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
