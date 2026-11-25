import React, { useEffect, useState } from 'react';
import {
  Users,
  Plus,
  Search,
  Phone,
  MessageSquare,
  Mail,
  MapPin,
  FileText,
  CreditCard,
  Edit2,
  Trash2,
  X,
  CheckCircle2,
  RefreshCw,
  Loader2,
  ArrowRight,
  TrendingDown,
} from 'lucide-react';
import { api } from '../services/api';
import { Customer } from '../types';

export const CustomersPage: React.FC = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Slideover profile
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [profileData, setProfileData] = useState<any>(null);
  const [loadingProfile, setLoadingProfile] = useState(false);

  // Create/Edit Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [companyName, setCompanyName] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [billingAddress, setBillingAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [gstin, setGstin] = useState('');
  const [creditLimit, setCreditLimit] = useState<number>(100000);
  const [paymentTermsDays, setPaymentTermsDays] = useState<number>(30);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const [notification, setNotification] = useState<string | null>(null);

  const loadCustomers = async () => {
    setLoading(true);
    try {
      const res = await api.getCustomers();
      setCustomers(res);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCustomers();
  }, []);

  const openCustomerProfile = async (id: string) => {
    setSelectedCustomerId(id);
    setLoadingProfile(true);
    try {
      const res = await api.getCustomerProfile(id);
      setProfileData(res);
    } catch (e: any) {
      alert(`Error loading profile: ${e.message}`);
    } finally {
      setLoadingProfile(false);
    }
  };

  const handleOpenCreate = () => {
    setEditingId(null);
    setCompanyName('');
    setContactPerson('');
    setEmail('');
    setPhone('+91 ');
    setWhatsappNumber('+91 ');
    setBillingAddress('');
    setCity('');
    setState('');
    setGstin('');
    setCreditLimit(100000);
    setPaymentTermsDays(30);
    setNotes('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (c: Customer) => {
    setEditingId(c.id);
    setCompanyName(c.company_name);
    setContactPerson(c.contact_person);
    setEmail(c.email);
    setPhone(c.phone);
    setWhatsappNumber(c.whatsapp_number);
    setBillingAddress(c.billing_address || '');
    setCity(c.city || '');
    setState(c.state || '');
    setGstin(c.gstin || '');
    setCreditLimit(c.credit_limit);
    setPaymentTermsDays(c.payment_terms_days);
    setNotes(c.notes || '');
    setIsModalOpen(true);
  };

  const handleSaveCustomer = async () => {
    if (!companyName || !contactPerson || !phone || !email) {
      alert('Please fill all mandatory contact fields.');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        company_name: companyName,
        contact_person: contactPerson,
        email: email,
        phone: phone,
        whatsapp_number: whatsappNumber || phone,
        billing_address: billingAddress,
        city: city,
        state: state,
        gstin: gstin,
        credit_limit: creditLimit,
        payment_terms_days: paymentTermsDays,
        notes: notes,
      };

      if (editingId) {
        await api.updateCustomer(editingId, payload);
        setNotification(`Customer ${companyName} updated.`);
      } else {
        await api.createCustomer(payload);
        setNotification(`Customer ${companyName} added.`);
      }
      setIsModalOpen(false);
      loadCustomers();
      setTimeout(() => setNotification(null), 4000);
    } catch (e: any) {
      alert(`Failed to save customer: ${e.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCustomer = async (c: Customer) => {
    if (!confirm(`Are you sure you want to delete ${c.company_name}?`)) return;
    try {
      await api.deleteCustomer(c.id);
      setNotification(`Customer ${c.company_name} deleted.`);
      loadCustomers();
      if (selectedCustomerId === c.id) {
        setSelectedCustomerId(null);
      }
      setTimeout(() => setNotification(null), 4000);
    } catch (e: any) {
      alert(e.message);
    }
  };

  const filtered = customers.filter((c) => {
    const s = searchTerm.toLowerCase();
    return (
      c.company_name.toLowerCase().includes(s) ||
      c.contact_person.toLowerCase().includes(s) ||
      c.phone.includes(s) ||
      (c.city && c.city.toLowerCase().includes(s))
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

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Customer Directory</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage B2B debtor relationships, credit limits, payment terms, and past recovery history.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleOpenCreate}
            className="px-4 py-2 bg-navy-900 hover:bg-navy-800 text-white text-xs font-semibold rounded-xl shadow-sm flex items-center gap-1.5 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Add Customer</span>
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="relative w-full sm:w-80">
        <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search by company, contact, phone, city..."
          className="w-full pl-9 pr-4 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
        />
      </div>

      {/* Customer Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-full py-12 text-center text-slate-400">
            <RefreshCw className="w-5 h-5 animate-spin mx-auto text-brand-600 mb-2" />
            <span>Loading debtors...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="col-span-full py-12 text-center text-slate-400 bg-white rounded-2xl border border-slate-200">
            No customers match your search query.
          </div>
        ) : (
          filtered.map((c) => {
            const hasOverdue = (c.total_overdue || 0) > 0;
            return (
              <div
                key={c.id}
                className="bg-white rounded-2xl p-5 border border-slate-200 shadow-card hover:shadow-card-hover transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="font-bold text-slate-900 text-sm leading-tight">{c.company_name}</h3>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={() => handleOpenEdit(c)}
                        className="p-1 text-slate-400 hover:text-slate-600 rounded-md hover:bg-slate-100"
                        title="Edit Customer"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteCustomer(c)}
                        className="p-1 text-slate-400 hover:text-rose-600 rounded-md hover:bg-rose-50"
                        title="Delete Customer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <p className="text-xs font-medium text-slate-600 mb-3">{c.contact_person}</p>

                  <div className="space-y-1.5 text-xs text-slate-500">
                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                      <span>{c.phone}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MessageSquare className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                      <span>{c.whatsapp_number}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Mail className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                      <span className="truncate">{c.email}</span>
                    </div>
                    {c.city && (
                      <div className="flex items-center gap-2">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                        <span>{c.city}, {c.state}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <div>
                    <span className="text-[11px] text-slate-400 block font-medium">Outstanding</span>
                    <span className={`text-base font-bold ${hasOverdue ? 'text-rose-600' : 'text-slate-800'}`}>
                      {formatCurrency(c.total_outstanding || 0)}
                    </span>
                  </div>
                  <button
                    onClick={() => openCustomerProfile(c.id)}
                    className="px-3 py-1.5 bg-slate-50 hover:bg-brand-50 text-slate-700 hover:text-brand-700 font-semibold text-xs rounded-xl border border-slate-200 transition-colors flex items-center gap-1"
                  >
                    <span>View Profile</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Customer Profile Slideover Drawer (Section 5) */}
      {selectedCustomerId && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-xs animate-fadeIn">
          <div className="w-full max-w-xl bg-white h-full shadow-2xl p-6 overflow-y-auto flex flex-col space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div>
                <h3 className="font-bold text-lg text-slate-900">
                  {profileData?.company_name || 'Customer Profile'}
                </h3>
                <span className="text-xs text-slate-500">Contact: {profileData?.contact_person}</span>
              </div>
              <button
                onClick={() => setSelectedCustomerId(null)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {loadingProfile ? (
              <div className="py-16 text-center text-slate-400">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto text-brand-600 mb-2" />
                <span>Loading complete financial profile...</span>
              </div>
            ) : profileData && (
              <div className="space-y-6">
                {/* Outstanding Header Card */}
                <div className="p-4 bg-gradient-to-r from-navy-900 to-royal-800 rounded-2xl text-white flex items-center justify-between">
                  <div>
                    <span className="text-xs text-slate-300 block">Total Outstanding Balance</span>
                    <span className="text-2xl font-bold">{formatCurrency(profileData.total_outstanding || 0)}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-slate-300 block">Credit Terms</span>
                    <span className="text-sm font-semibold">{profileData.payment_terms_days} Days</span>
                  </div>
                </div>

                {/* Notes & Past Delays */}
                {profileData.notes && (
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700">
                    <strong className="text-slate-900">Credit Notes & History:</strong>
                    <p className="mt-1">{profileData.notes}</p>
                  </div>
                )}

                {/* Invoices List */}
                <div>
                  <h4 className="font-semibold text-slate-900 text-sm mb-2 flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-brand-600" />
                    <span>Invoices ({profileData.invoices?.length || 0})</span>
                  </h4>
                  <div className="space-y-2">
                    {profileData.invoices?.map((inv: any) => (
                      <div key={inv.id} className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
                        <div>
                          <span className="font-bold text-slate-800">{inv.invoice_number}</span>
                          <span className="text-slate-400 block">Due: {inv.due_date}</span>
                        </div>
                        <div className="text-right">
                          <span className="font-bold text-navy-900">{formatCurrency(inv.remaining_amount)}</span>
                          <span className="block text-[10px] uppercase font-bold text-slate-500">{inv.status}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Payment History */}
                <div>
                  <h4 className="font-semibold text-slate-900 text-sm mb-2 flex items-center gap-1.5">
                    <CreditCard className="w-4 h-4 text-emerald-600" />
                    <span>Payment History ({profileData.payments?.length || 0})</span>
                  </h4>
                  <div className="space-y-2">
                    {profileData.payments?.map((pay: any) => (
                      <div key={pay.id} className="p-3 rounded-xl bg-emerald-50/50 border border-emerald-100 flex items-center justify-between text-xs">
                        <div>
                          <span className="font-semibold text-emerald-900">{pay.payment_number}</span>
                          <span className="text-slate-400 block">{pay.payment_date} • {pay.payment_method.toUpperCase()}</span>
                        </div>
                        <span className="font-bold text-emerald-700">+{formatCurrency(pay.amount)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add / Edit Customer Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-elevated w-full max-w-lg p-6 border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-base">
                {editingId ? 'Edit Customer' : 'Add New Customer'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="p-1 rounded-lg text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Company Name</label>
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="e.g. Apex Electricals Pvt Ltd"
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Contact Person</label>
                  <input
                    type="text"
                    value={contactPerson}
                    onChange={(e) => setContactPerson(e.target.value)}
                    placeholder="e.g. Suresh Patel"
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="accounts@customer.com"
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Phone Number</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 98201 12345"
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">WhatsApp Number</label>
                  <input
                    type="text"
                    value={whatsappNumber}
                    onChange={(e) => setWhatsappNumber(e.target.value)}
                    placeholder="+91 98201 12345"
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">City</label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">State</label>
                  <input
                    type="text"
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Credit Days</label>
                  <input
                    type="number"
                    value={paymentTermsDays}
                    onChange={(e) => setPaymentTermsDays(Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Notes & Payment Habit</label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Usually pays on Fridays, follow up on WhatsApp"
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
                onClick={handleSaveCustomer}
                disabled={saving}
                className="px-4 py-2 text-xs font-semibold bg-navy-900 hover:bg-navy-800 text-white rounded-xl flex items-center gap-1.5"
              >
                {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>{editingId ? 'Update Customer' : 'Save Customer'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
