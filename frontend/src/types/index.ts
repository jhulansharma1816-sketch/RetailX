export type InvoiceStatus = 'draft' | 'sent' | 'overdue' | 'partially_paid' | 'paid' | 'disputed';
export type PromiseStatus = 'pending' | 'fulfilled' | 'missed' | 'rescheduled';
export type TaskType = 'whatsapp' | 'call' | 'email' | 'verification' | 'dispute_resolution' | 'visit';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';
export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';
export type DisputeStatus = 'open' | 'under_review' | 'awaiting_customer' | 'resolved' | 'rejected';
export type CommChannel = 'whatsapp' | 'sms' | 'email' | 'voice_call' | 'manual_call' | 'chatbot';

export interface Customer {
  id: string;
  business_id: string;
  company_name: string;
  contact_person: string;
  email: string;
  phone: string;
  whatsapp_number: string;
  billing_address?: string;
  city?: string;
  state?: string;
  gstin?: string;
  credit_limit: number;
  payment_terms_days: number;
  notes?: string;
  total_outstanding?: number;
  overdue_count?: number;
  total_overdue?: number;
  is_active: number;
  created_at: string;
}

export interface Invoice {
  id: string;
  business_id: string;
  customer_id: string;
  company_name?: string;
  contact_person?: string;
  customer_phone?: string;
  customer_whatsapp?: string;
  invoice_number: string;
  issue_date: string;
  due_date: string;
  total_amount: number;
  paid_amount: number;
  remaining_amount: number;
  tax_amount: number;
  currency: string;
  status: InvoiceStatus;
  description?: string;
  attachment_url?: string;
  missed_promises_count?: number;
  open_disputes_count?: number;
  created_at: string;
}

export interface Payment {
  id: string;
  business_id: string;
  customer_id: string;
  invoice_id: string;
  payment_number: string;
  amount: number;
  payment_date: string;
  payment_method: string;
  transaction_reference?: string;
  notes?: string;
  company_name?: string;
  contact_person?: string;
  invoice_number?: string;
  invoice_total?: number;
  invoice_remaining?: number;
  created_at: string;
}

export interface PaymentPromise {
  id: string;
  business_id: string;
  customer_id: string;
  invoice_id: string;
  promised_amount: number;
  promised_date: string;
  commitment_notes?: string;
  status: PromiseStatus;
  fulfilled_at?: string;
  company_name?: string;
  contact_person?: string;
  phone?: string;
  whatsapp_number?: string;
  invoice_number?: string;
  invoice_total?: number;
  invoice_remaining?: number;
  invoice_due_date?: string;
  created_at: string;
}

export interface RecoveryTask {
  id: string;
  business_id: string;
  customer_id: string;
  invoice_id?: string;
  title: string;
  task_type: TaskType;
  priority: TaskPriority;
  due_date: string;
  assigned_to?: string;
  notes?: string;
  status: TaskStatus;
  outcome_notes?: string;
  completed_at?: string;
  company_name?: string;
  contact_person?: string;
  phone?: string;
  whatsapp_number?: string;
  invoice_number?: string;
  remaining_amount?: number;
  created_at: string;
}

export interface Dispute {
  id: string;
  business_id: string;
  customer_id: string;
  invoice_id: string;
  dispute_number: string;
  category: string;
  description: string;
  disputed_amount: number;
  status: DisputeStatus;
  assigned_to?: string;
  resolution_notes?: string;
  resolved_at?: string;
  company_name?: string;
  contact_person?: string;
  phone?: string;
  invoice_number?: string;
  invoice_total?: number;
  invoice_remaining?: number;
  created_at: string;
}

export interface CommunicationLog {
  id: string;
  business_id: string;
  customer_id: string;
  invoice_id?: string;
  channel: CommChannel;
  recipient: string;
  subject_or_title?: string;
  message_body: string;
  status: string;
  provider_message_id?: string;
  response_text?: string;
  follow_up_action?: string;
  is_demo: number;
  company_name?: string;
  contact_person?: string;
  invoice_number?: string;
  created_at: string;
}

export interface VoiceCallLog {
  id: string;
  phone_number: string;
  script_used: string;
  transcript: string;
  detected_intent: string;
  outcome: string;
  duration_seconds: number;
  status: string;
  is_demo: number;
  created_at: string;
}

export interface RecoveryWorklistItem {
  invoice_id: string;
  invoice_number: string;
  due_date: string;
  days_overdue: number;
  total_amount: number;
  paid_amount: number;
  remaining_amount: number;
  invoice_status: InvoiceStatus;
  customer_id: string;
  company_name: string;
  contact_person: string;
  phone: string;
  whatsapp_number: string;
  email: string;
  missed_promises: number;
  pending_promises: number;
  open_disputes: number;
  follow_up_count: number;
  last_contact_date?: string;
  score: number;
  priority: string;
  priority_level: 'high' | 'medium' | 'low' | 'dispute';
  explanation: string;
  suggested_action: string;
  action_type: string;
}

export interface DashboardSummary {
  total_outstanding: number;
  total_overdue: number;
  overdue_invoices_count: number;
  collected_this_month: number;
  payments_count_month: number;
  due_soon_amount: number;
  due_soon_count: number;
  today_followups: number;
  missed_promises_count: number;
  missed_promises_amount: number;
  open_disputes_count: number;
  open_disputes_amount: number;
  recovery_success_rate: number;
}
