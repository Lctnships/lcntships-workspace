#!/bin/bash

# MCP HTTP endpoint
MCP_URL="https://mcp.supabase.com/mcp?project_ref=ytmkmiofoluespwysfxa"

# SQL to execute
SQL=$(cat <<'EOF'
CREATE TABLE IF NOT EXISTS email_sequences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paused')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

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

ALTER TABLE email_sequences ENABLE ROW LEVEL SECURITY;
ALTER TABLE sequence_emails ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can only see their own sequences" ON email_sequences
  FOR ALL USING (user_id = auth.uid());
  
CREATE POLICY "Users can only see sequence emails from their sequences" ON sequence_emails
  FOR ALL USING (sequence_id IN (SELECT id FROM email_sequences WHERE user_id = auth.uid()));
EOF
)

# Send request to MCP
echo "🚀 Sending request to MCP..."
echo ""

curl -X POST "$MCP_URL" \
  -H "Content-Type: application/json" \
  -d "{
    \"jsonrpc\": \"2.0\",
    \"method\": \"query\",
    \"params\": {
      \"sql\": $(echo "$SQL" | jq -Rs .)
    },
    \"id\": 1
  }" 2>/dev/null | jq .

echo ""
echo "✅ Done!"
