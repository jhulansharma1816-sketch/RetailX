import {
  Customer,
  Invoice,
  Payment,
  PaymentPromise,
  RecoveryTask,
  Dispute,
  CommunicationLog,
  RecoveryWorklistItem,
  DashboardSummary
} from '../types';

const API_BASE = '/api';

async function request<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const url = `${API_BASE}${endpoint}`;
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    ...options,
  });

  if (!response.ok) {
    let errorMsg = 'An unexpected error occurred';
    try {
      const errData = await response.json();
      errorMsg = errData.detail || errData.message || errorMsg;
    } catch {
      // Use status text if not json
      errorMsg = response.statusText || errorMsg;
    }
    throw new Error(errorMsg);
  }

  return response.json();
}

export const api = {
  // Auth
  login: (data: { email: string; password: string }) =>
    request<{ success: boolean; token: string; user: any }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  signup: (data: any) =>
    request<{ success: boolean; token: string; user: any }>('/auth/signup', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getMe: () => request<any>('/auth/me'),

  // Dashboard
  getDashboardSummary: () => request<DashboardSummary>('/dashboard/summary'),
  getDashboardCharts: () => request<any>('/dashboard/charts'),
  getRecentActivity: () => request<any>('/dashboard/recent-activity'),

  // Customers
  getCustomers: (params?: { search?: string; status?: string }) => {
    const query = new URLSearchParams(params as any).toString();
    return request<Customer[]>(`/customers${query ? `?${query}` : ''}`);
  },
  getCustomerProfile: (id: string) => request<any>(`/customers/${id}`),
  createCustomer: (data: any) =>
    request<{ success: boolean; id: string; message: string }>('/customers', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateCustomer: (id: string, data: any) =>
    request<{ success: boolean; message: string }>(`/customers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  deleteCustomer: (id: string) =>
    request<{ success: boolean; message: string }>(`/customers/${id}`, {
      method: 'DELETE',
    }),

  // Invoices
  getInvoices: (params?: { status?: string; search?: string; customer_id?: string }) => {
    const query = new URLSearchParams(params as any).toString();
    return request<Invoice[]>(`/invoices${query ? `?${query}` : ''}`);
  },
  getInvoiceDetails: (id: string) => request<any>(`/invoices/${id}`),
  createInvoice: (data: any) =>
    request<{ success: boolean; id: string; message: string }>('/invoices', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateInvoice: (id: string, data: any) =>
    request<{ success: boolean; message: string }>(`/invoices/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  deleteInvoice: (id: string) =>
    request<{ success: boolean; message: string }>(`/invoices/${id}`, {
      method: 'DELETE',
    }),

  // Payments
  getPayments: (params?: { customer_id?: string; invoice_id?: string }) => {
    const query = new URLSearchParams(params as any).toString();
    return request<Payment[]>(`/payments${query ? `?${query}` : ''}`);
  },
  recordPayment: (data: any) =>
    request<{ success: boolean; payment_id: string; payment_number: string; invoice_status: string; remaining_balance: number; message: string }>('/payments', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Recovery Assistant
  getRecoveryWorklist: () =>
    request<{ success: boolean; count: number; worklist: RecoveryWorklistItem[] }>('/recovery/worklist'),
  executeRecoveryAction: (data: any) =>
    request<any>('/recovery/execute-action', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Promises
  getPromises: (params?: { status?: string }) => {
    const query = new URLSearchParams(params as any).toString();
    return request<PaymentPromise[]>(`/promises${query ? `?${query}` : ''}`);
  },
  recordPromise: (data: any) =>
    request<{ success: boolean; id: string; message: string }>('/promises', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updatePromiseStatus: (id: string, data: any) =>
    request<{ success: boolean; message: string }>(`/promises/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  // Tasks
  getTasks: (params?: { status?: string; priority?: string }) => {
    const query = new URLSearchParams(params as any).toString();
    return request<RecoveryTask[]>(`/tasks${query ? `?${query}` : ''}`);
  },
  createTask: (data: any) =>
    request<{ success: boolean; id: string; message: string }>('/tasks', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateTask: (id: string, data: any) =>
    request<{ success: boolean; message: string }>(`/tasks/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  // Disputes
  getDisputes: (params?: { status?: string }) => {
    const query = new URLSearchParams(params as any).toString();
    return request<Dispute[]>(`/disputes${query ? `?${query}` : ''}`);
  },
  raiseDispute: (data: any) =>
    request<{ success: boolean; id: string; dispute_number: string; message: string }>('/disputes', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateDispute: (id: string, data: any) =>
    request<{ success: boolean; message: string }>(`/disputes/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  // Communications
  getCommunications: (params?: { channel?: string; status?: string; customer_id?: string }) => {
    const query = new URLSearchParams(params as any).toString();
    return request<CommunicationLog[]>(`/communications${query ? `?${query}` : ''}`);
  },
  sendWhatsApp: (data: any) =>
    request<any>('/communications/whatsapp', { method: 'POST', body: JSON.stringify(data) }),
  sendSMS: (data: any) =>
    request<any>('/communications/sms', { method: 'POST', body: JSON.stringify(data) }),
  sendEmail: (data: any) =>
    request<any>('/communications/email', { method: 'POST', body: JSON.stringify(data) }),
  makeVoiceCall: (data: any) =>
    request<any>('/communications/voice-call', { method: 'POST', body: JSON.stringify(data) }),
  runScheduler: (forceRun = false) =>
    request<any>(`/communications/run-scheduler?force_run=${forceRun}`, { method: 'POST' }),

  // Chatbot
  askChatbot: (message: string, conversation_id?: string) =>
    request<{ success: boolean; conversation_id: string; reply: string; grounded_figures: any }>('/chatbot/query', {
      method: 'POST',
      body: JSON.stringify({ message, conversation_id }),
    }),

  // Settings
  getSettings: () => request<any>('/settings'),
  updateBusiness: (data: any) =>
    request<any>('/settings/business', { method: 'PUT', body: JSON.stringify(data) }),
  updateIntegration: (data: any) =>
    request<any>('/settings/integration', { method: 'PUT', body: JSON.stringify(data) }),

  // Import / Export
  importInvoices: async (file: File, commit = false) => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`${API_BASE}/data/import-invoices?commit=${commit}`, {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },
  exportInvoicesUrl: `${API_BASE}/data/export-invoices`,
  exportCustomersUrl: `${API_BASE}/data/export-customers`,
};
