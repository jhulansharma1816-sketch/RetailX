-- ============================================================================
-- Smart B2B Payment Recovery Platform - PostgreSQL Database Schema
-- Supabase Compatible with Row Level Security (RLS) & Multi-Tenant Isolation
-- ============================================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Profiles (Linked to auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'admin' CHECK (role IN ('owner', 'admin', 'manager', 'collector', 'viewer')),
    phone TEXT,
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- 2. Businesses
CREATE TABLE IF NOT EXISTS public.businesses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    business_type TEXT NOT NULL DEFAULT 'Wholesale / Distribution',
    gstin TEXT,
    phone TEXT NOT NULL,
    email TEXT NOT NULL,
    address TEXT NOT NULL,
    city TEXT NOT NULL,
    state TEXT NOT NULL,
    country TEXT NOT NULL DEFAULT 'India',
    postal_code TEXT,
    currency TEXT NOT NULL DEFAULT 'INR',
    settings JSONB DEFAULT '{"auto_reminders_enabled": true, "max_reminders_per_week": 2, "dnd_start": "20:00", "dnd_end": "09:00"}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- 3. Business Members (Team & Multi-Tenant mapping)
CREATE TABLE IF NOT EXISTS public.business_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'admin' CHECK (role IN ('owner', 'admin', 'manager', 'collector', 'viewer')),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'invited', 'deactivated')),
    joined_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    UNIQUE(business_id, user_id)
);

-- 4. Customers (B2B Debtors & Clients)
CREATE TABLE IF NOT EXISTS public.customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    company_name TEXT NOT NULL,
    contact_person TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT NOT NULL,
    whatsapp_number TEXT NOT NULL,
    billing_address TEXT,
    city TEXT,
    state TEXT,
    gstin TEXT,
    credit_limit NUMERIC(12, 2) DEFAULT 0.00,
    payment_terms_days INTEGER DEFAULT 30,
    notes TEXT,
    tags TEXT[] DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- 5. Invoices
CREATE TABLE IF NOT EXISTS public.invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE RESTRICT,
    invoice_number TEXT NOT NULL,
    issue_date DATE NOT NULL,
    due_date DATE NOT NULL,
    total_amount NUMERIC(12, 2) NOT NULL CHECK (total_amount > 0),
    paid_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (paid_amount >= 0),
    remaining_amount NUMERIC(12, 2) NOT NULL CHECK (remaining_amount >= 0),
    tax_amount NUMERIC(12, 2) DEFAULT 0.00,
    currency TEXT NOT NULL DEFAULT 'INR',
    status TEXT NOT NULL DEFAULT 'sent' CHECK (status IN ('draft', 'sent', 'overdue', 'partially_paid', 'paid', 'disputed')),
    description TEXT,
    attachment_url TEXT,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    UNIQUE(business_id, invoice_number)
);

-- 6. Payments
CREATE TABLE IF NOT EXISTS public.payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE RESTRICT,
    invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE RESTRICT,
    payment_number TEXT NOT NULL,
    amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
    payment_date DATE NOT NULL,
    payment_method TEXT NOT NULL DEFAULT 'bank_transfer' CHECK (payment_method IN ('bank_transfer', 'upi', 'cheque', 'cash', 'card', 'online')),
    transaction_reference TEXT,
    notes TEXT,
    recorded_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- 7. Payment Promises
CREATE TABLE IF NOT EXISTS public.payment_promises (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
    invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
    promised_amount NUMERIC(12, 2) NOT NULL CHECK (promised_amount > 0),
    promised_date DATE NOT NULL,
    commitment_notes TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'fulfilled', 'missed', 'rescheduled')),
    fulfilled_at TIMESTAMPTZ,
    recorded_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- 8. Recovery Tasks
CREATE TABLE IF NOT EXISTS public.recovery_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
    invoice_id UUID REFERENCES public.invoices(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    task_type TEXT NOT NULL DEFAULT 'whatsapp' CHECK (task_type IN ('whatsapp', 'call', 'email', 'verification', 'dispute_resolution', 'visit')),
    priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    due_date DATE NOT NULL,
    assigned_to UUID REFERENCES public.profiles(id),
    notes TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
    outcome_notes TEXT,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- 9. Disputes
CREATE TABLE IF NOT EXISTS public.disputes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
    invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
    dispute_number TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('pricing_error', 'damaged_goods', 'short_shipment', 'tax_mismatch', 'already_paid', 'other')),
    description TEXT NOT NULL,
    disputed_amount NUMERIC(12, 2) NOT NULL CHECK (disputed_amount >= 0),
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'under_review', 'awaiting_customer', 'resolved', 'rejected')),
    assigned_to UUID REFERENCES public.profiles(id),
    resolution_notes TEXT,
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- 10. Dispute Documents
CREATE TABLE IF NOT EXISTS public.dispute_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dispute_id UUID NOT NULL REFERENCES public.disputes(id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    file_url TEXT NOT NULL,
    file_type TEXT,
    file_size INTEGER,
    uploaded_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- 11. Reminder Rules
CREATE TABLE IF NOT EXISTS public.reminder_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    rule_type TEXT NOT NULL CHECK (rule_type IN ('before_due', 'on_due', 'after_due', 'missed_promise')),
    days_offset INTEGER NOT NULL DEFAULT 0,
    channels JSONB NOT NULL DEFAULT '["whatsapp", "email"]'::jsonb,
    is_active BOOLEAN NOT NULL DEFAULT true,
    max_frequency_days INTEGER DEFAULT 3,
    working_hours_start TIME DEFAULT '09:00:00',
    working_hours_end TIME DEFAULT '19:00:00',
    timezone TEXT DEFAULT 'Asia/Kolkata',
    exclude_disputed BOOLEAN DEFAULT true,
    stop_on_paid BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- 12. Message Templates
CREATE TABLE IF NOT EXISTS public.message_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    channel TEXT NOT NULL CHECK (channel IN ('whatsapp', 'sms', 'email', 'voice')),
    name TEXT NOT NULL,
    subject TEXT,
    body TEXT NOT NULL,
    dlt_template_id TEXT,
    dlt_sender_id TEXT,
    variables JSONB DEFAULT '[]'::jsonb,
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- 13. Communication Logs
CREATE TABLE IF NOT EXISTS public.communication_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
    invoice_id UUID REFERENCES public.invoices(id) ON DELETE SET NULL,
    channel TEXT NOT NULL CHECK (channel IN ('whatsapp', 'sms', 'email', 'voice_call', 'manual_call', 'chatbot')),
    recipient TEXT NOT NULL,
    subject_or_title TEXT,
    message_body TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'sent' CHECK (status IN ('queued', 'sent', 'delivered', 'failed', 'opened', 'clicked')),
    provider_message_id TEXT,
    provider_response JSONB DEFAULT '{}'::jsonb,
    response_text TEXT,
    follow_up_action TEXT,
    is_demo BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- 14. Voice Call Logs
CREATE TABLE IF NOT EXISTS public.voice_call_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
    invoice_id UUID REFERENCES public.invoices(id) ON DELETE SET NULL,
    phone_number TEXT NOT NULL,
    script_used TEXT NOT NULL,
    audio_url TEXT,
    transcript TEXT,
    detected_intent TEXT CHECK (detected_intent IN ('will_pay_soon', 'already_paid', 'call_back_later', 'dispute_raised', 'human_request', 'no_answer', 'voicemail')),
    outcome TEXT CHECK (outcome IN ('promise_recorded', 'follow_up_created', 'dispute_flagged', 'payment_verification', 'failed', 'unreachable')),
    duration_seconds INTEGER DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'failed', 'cancelled')),
    is_demo BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- 15. Chatbot Conversations
CREATE TABLE IF NOT EXISTS public.chatbot_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL DEFAULT 'Recovery Chat Session',
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- 16. Chatbot Messages
CREATE TABLE IF NOT EXISTS public.chatbot_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES public.chatbot_conversations(id) ON DELETE CASCADE,
    sender_role TEXT NOT NULL CHECK (sender_role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- 17. Integrations
CREATE TABLE IF NOT EXISTS public.integrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    provider TEXT NOT NULL CHECK (provider IN ('whatsapp', 'sms', 'email', 'voice', 'llm')),
    is_active BOOLEAN NOT NULL DEFAULT false,
    is_demo_mode BOOLEAN NOT NULL DEFAULT true,
    status TEXT NOT NULL DEFAULT 'not_connected' CHECK (status IN ('connected', 'not_connected', 'configuration_required', 'error')),
    config JSONB DEFAULT '{}'::jsonb,
    last_synced_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    UNIQUE(business_id, provider)
);

-- 18. Notification Preferences
CREATE TABLE IF NOT EXISTS public.notification_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    email_on_payment BOOLEAN DEFAULT true,
    email_on_promise_missed BOOLEAN DEFAULT true,
    email_on_dispute BOOLEAN DEFAULT true,
    whatsapp_digest_daily BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    UNIQUE(business_id, user_id)
);

-- 19. Activity Logs (Audit Trail)
CREATE TABLE IF NOT EXISTS public.activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id),
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT,
    description TEXT NOT NULL,
    ip_address TEXT,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_customers_business ON public.customers(business_id);
CREATE INDEX IF NOT EXISTS idx_invoices_business ON public.invoices(business_id);
CREATE INDEX IF NOT EXISTS idx_invoices_customer ON public.invoices(customer_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON public.invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_due_date ON public.invoices(due_date);
CREATE INDEX IF NOT EXISTS idx_payments_business ON public.payments(business_id);
CREATE INDEX IF NOT EXISTS idx_payments_invoice ON public.payments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_promises_business ON public.payment_promises(business_id);
CREATE INDEX IF NOT EXISTS idx_promises_status ON public.payment_promises(status);
CREATE INDEX IF NOT EXISTS idx_tasks_business ON public.recovery_tasks(business_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON public.recovery_tasks(status);
CREATE INDEX IF NOT EXISTS idx_disputes_business ON public.disputes(business_id);
CREATE INDEX IF NOT EXISTS idx_comm_logs_business ON public.communication_logs(business_id);
CREATE INDEX IF NOT EXISTS idx_voice_logs_business ON public.voice_call_logs(business_id);
CREATE INDEX IF NOT EXISTS idx_activity_business ON public.activity_logs(business_id);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- Multi-Tenant Data Protection: Each user only accesses their business's data
-- ============================================================================
ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_promises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recovery_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.disputes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dispute_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reminder_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.communication_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.voice_call_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chatbot_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chatbot_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- Helper Function: Check user membership in business
CREATE OR REPLACE FUNCTION public.user_belongs_to_business(b_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.business_members bm
        WHERE bm.business_id = b_id AND bm.user_id = auth.uid() AND bm.status = 'active'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Policies for Customers
CREATE POLICY "Users can manage customers of their business"
ON public.customers
FOR ALL
USING (public.user_belongs_to_business(business_id));

-- Policies for Invoices
CREATE POLICY "Users can manage invoices of their business"
ON public.invoices
FOR ALL
USING (public.user_belongs_to_business(business_id));

-- Policies for Payments
CREATE POLICY "Users can manage payments of their business"
ON public.payments
FOR ALL
USING (public.user_belongs_to_business(business_id));

-- Policies for Promises
CREATE POLICY "Users can manage promises of their business"
ON public.payment_promises
FOR ALL
USING (public.user_belongs_to_business(business_id));

-- Policies for Tasks
CREATE POLICY "Users can manage tasks of their business"
ON public.recovery_tasks
FOR ALL
USING (public.user_belongs_to_business(business_id));

-- Policies for Disputes
CREATE POLICY "Users can manage disputes of their business"
ON public.disputes
FOR ALL
USING (public.user_belongs_to_business(business_id));

-- Policies for Communications
CREATE POLICY "Users can view communications of their business"
ON public.communication_logs
FOR ALL
USING (public.user_belongs_to_business(business_id));

-- Policies for Integrations
CREATE POLICY "Users can manage integrations of their business"
ON public.integrations
FOR ALL
USING (public.user_belongs_to_business(business_id));
