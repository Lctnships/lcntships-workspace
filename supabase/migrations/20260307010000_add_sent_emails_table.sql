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
