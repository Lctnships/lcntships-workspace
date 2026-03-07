-- Email Accounts (IMAP/SMTP configuratie)
CREATE TABLE IF NOT EXISTS email_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  name VARCHAR(255),
  provider VARCHAR(50) NOT NULL CHECK (provider IN ('gmail', 'outlook', 'imap')),
  imap_host VARCHAR(255),
  imap_port INTEGER DEFAULT 993,
  smtp_host VARCHAR(255),
  smtp_port INTEGER DEFAULT 587,
  username VARCHAR(255),
  password_encrypted TEXT, -- Versleuteld opslaan!
  is_connected BOOLEAN DEFAULT false,
  last_sync_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Emails (opgeslagen emails)
CREATE TABLE IF NOT EXISTS emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID REFERENCES email_accounts(id) ON DELETE CASCADE,
  message_id VARCHAR(500) UNIQUE, -- Originele message ID van mailserver
  thread_id VARCHAR(500),
  folder VARCHAR(50) NOT NULL DEFAULT 'inbox' CHECK (folder IN ('inbox', 'sent', 'drafts', 'trash', 'spam', 'archive')),
  subject VARCHAR(1000),
  from_name VARCHAR(255),
  from_email VARCHAR(255) NOT NULL,
  to_emails JSONB NOT NULL DEFAULT '[]',
  cc_emails JSONB DEFAULT '[]',
  bcc_emails JSONB DEFAULT '[]',
  body_text TEXT,
  body_html TEXT,
  is_read BOOLEAN DEFAULT false,
  is_starred BOOLEAN DEFAULT false,
  attachments JSONB DEFAULT '[]', -- [{filename, size, content_type, url}]
  sent_at TIMESTAMP WITH TIME ZONE,
  received_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Email Templates
CREATE TABLE IF NOT EXISTS email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  subject VARCHAR(500) NOT NULL,
  body TEXT NOT NULL,
  is_shared BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Email Sequences
CREATE TABLE IF NOT EXISTS email_sequences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paused')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Sequence Emails (individuele emails in een sequence)
CREATE TABLE IF NOT EXISTS sequence_emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sequence_id UUID REFERENCES email_sequences(id) ON DELETE CASCADE,
  subject VARCHAR(500) NOT NULL,
  body TEXT NOT NULL,
  delay_days INTEGER NOT NULL DEFAULT 0,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enrolled Leads (leads die in een sequence zitten)
CREATE TABLE IF NOT EXISTS sequence_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sequence_id UUID REFERENCES email_sequences(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES sales_leads(id) ON DELETE CASCADE,
  current_step INTEGER DEFAULT 0, -- Hoeveelste email in de sequence
  status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'bounced', 'unsubscribed')),
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  next_send_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(sequence_id, lead_id)
);

-- Sequence Email Logs (verzonden emails uit sequences)
CREATE TABLE IF NOT EXISTS sequence_email_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id UUID REFERENCES sequence_enrollments(id) ON DELETE CASCADE,
  sequence_email_id UUID REFERENCES sequence_emails(id) ON DELETE CASCADE,
  subject VARCHAR(500),
  body TEXT,
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  opened_at TIMESTAMP WITH TIME ZONE,
  clicked_at TIMESTAMP WITH TIME ZONE,
  status VARCHAR(50) DEFAULT 'sent' CHECK (status IN ('sent', 'delivered', 'bounced', 'failed'))
);

-- Invoices
CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  invoice_number VARCHAR(100) UNIQUE NOT NULL,
  customer_name VARCHAR(255) NOT NULL,
  customer_email VARCHAR(255) NOT NULL,
  customer_company VARCHAR(255),
  customer_address TEXT,
  subtotal DECIMAL(10,2) NOT NULL DEFAULT 0,
  tax_rate DECIMAL(5,2) DEFAULT 21.00,
  tax_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  total DECIMAL(10,2) NOT NULL DEFAULT 0,
  currency VARCHAR(3) DEFAULT 'EUR',
  status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'paid', 'overdue', 'cancelled')),
  issue_date DATE NOT NULL,
  due_date DATE NOT NULL,
  paid_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  pdf_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Invoice Items
CREATE TABLE IF NOT EXISTS invoice_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price DECIMAL(10,2) NOT NULL DEFAULT 0,
  total DECIMAL(10,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Contracts
CREATE TABLE IF NOT EXISTS contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title VARCHAR(500) NOT NULL,
  description TEXT,
  customer_name VARCHAR(255) NOT NULL,
  customer_email VARCHAR(255) NOT NULL,
  customer_company VARCHAR(255),
  file_url TEXT,
  file_name VARCHAR(500),
  status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'viewed', 'signed', 'expired', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  sent_at TIMESTAMP WITH TIME ZONE,
  viewed_at TIMESTAMP WITH TIME ZONE,
  signed_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE,
  signature_url TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Email Tracking (opens & clicks)
CREATE TABLE IF NOT EXISTS email_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email_id UUID REFERENCES emails(id) ON DELETE CASCADE,
  tracking_type VARCHAR(50) CHECK (tracking_type IN ('open', 'click')),
  ip_address INET,
  user_agent TEXT,
  link_url TEXT, -- Alleen voor clicks
  tracked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes voor betere performance
CREATE INDEX idx_emails_account_folder ON emails(account_id, folder);
CREATE INDEX idx_emails_thread ON emails(thread_id);
CREATE INDEX idx_emails_received ON emails(received_at DESC);
CREATE INDEX idx_sequence_enrollments_sequence ON sequence_enrollments(sequence_id);
CREATE INDEX idx_sequence_enrollments_lead ON sequence_enrollments(lead_id);
CREATE INDEX idx_sequence_enrollments_next_send ON sequence_enrollments(next_send_at);
CREATE INDEX idx_invoices_user_status ON invoices(user_id, status);
CREATE INDEX idx_invoices_customer ON invoices(customer_email);
CREATE INDEX idx_contracts_user_status ON contracts(user_id, status);

-- Enable Row Level Security
ALTER TABLE email_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE emails ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_sequences ENABLE ROW LEVEL SECURITY;
ALTER TABLE sequence_emails ENABLE ROW LEVEL SECURITY;
ALTER TABLE sequence_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE sequence_email_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_tracking ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can only see their own email accounts" ON email_accounts
  FOR ALL USING (user_id = auth.uid());

CREATE POLICY "Users can only see their own emails" ON emails
  FOR ALL USING (account_id IN (SELECT id FROM email_accounts WHERE user_id = auth.uid()));

CREATE POLICY "Users can only see their own templates" ON email_templates
  FOR ALL USING (user_id = auth.uid() OR is_shared = true);

CREATE POLICY "Users can only see their own sequences" ON email_sequences
  FOR ALL USING (user_id = auth.uid());

CREATE POLICY "Users can only see sequence emails from their sequences" ON sequence_emails
  FOR ALL USING (sequence_id IN (SELECT id FROM email_sequences WHERE user_id = auth.uid()));

CREATE POLICY "Users can only see enrollments from their sequences" ON sequence_enrollments
  FOR ALL USING (sequence_id IN (SELECT id FROM email_sequences WHERE user_id = auth.uid()));

CREATE POLICY "Users can only see their own invoices" ON invoices
  FOR ALL USING (user_id = auth.uid());

CREATE POLICY "Users can only see invoice items from their invoices" ON invoice_items
  FOR ALL USING (invoice_id IN (SELECT id FROM invoices WHERE user_id = auth.uid()));

CREATE POLICY "Users can only see their own contracts" ON contracts
  FOR ALL USING (user_id = auth.uid());

-- Functions voor automatische updates
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers voor updated_at
CREATE TRIGGER update_email_accounts_updated_at BEFORE UPDATE ON email_accounts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_emails_updated_at BEFORE UPDATE ON emails
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_email_templates_updated_at BEFORE UPDATE ON email_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_email_sequences_updated_at BEFORE UPDATE ON email_sequences
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_sequence_emails_updated_at BEFORE UPDATE ON sequence_emails
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_sequence_enrollments_updated_at BEFORE UPDATE ON sequence_enrollments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON invoices
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_contracts_updated_at BEFORE UPDATE ON contracts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Sent emails to leads (for tracking)
CREATE TABLE IF NOT EXISTS sent_emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES sales_leads(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  subject VARCHAR(500) NOT NULL,
  body TEXT,
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status VARCHAR(50) DEFAULT 'sent' CHECK (status IN ('sent', 'delivered', 'bounced', 'failed')),
  opened_at TIMESTAMP WITH TIME ZONE,
  clicked_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_sent_emails_lead ON sent_emails(lead_id);
CREATE INDEX idx_sent_emails_sent_at ON sent_emails(sent_at DESC);

ALTER TABLE sent_emails ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can see sent emails for their leads" ON sent_emails
  FOR SELECT USING (user_id = auth.uid());

CREATE TRIGGER update_sent_emails_updated_at BEFORE UPDATE ON sent_emails
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
