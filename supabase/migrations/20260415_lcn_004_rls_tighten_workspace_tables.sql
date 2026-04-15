-- LCN-004 — tighten RLS qual='true' on workspace-internal tables.
-- Replaces public-role policies with authenticated-only role.
-- Tables in scope: sales_leads, lead_contacts, lead_activities, sales_agenda,
--                  sent_emails, team_members, customers, content_briefs, content_templates
-- Out of scope: users / profiles (intentionally readable by public marketplace).

-- ============ sales_leads ============
DROP POLICY IF EXISTS "Allow all users to read sales_leads"   ON public.sales_leads;
DROP POLICY IF EXISTS "Allow all users to insert sales_leads" ON public.sales_leads;
DROP POLICY IF EXISTS "Allow all users to update sales_leads" ON public.sales_leads;
DROP POLICY IF EXISTS "Allow all users to delete sales_leads" ON public.sales_leads;
CREATE POLICY "auth_select_sales_leads" ON public.sales_leads FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_insert_sales_leads" ON public.sales_leads FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth_update_sales_leads" ON public.sales_leads FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_delete_sales_leads" ON public.sales_leads FOR DELETE TO authenticated USING (true);

-- ============ lead_contacts ============
DROP POLICY IF EXISTS "Allow all users to select lead_contacts" ON public.lead_contacts;
DROP POLICY IF EXISTS "Allow all users to insert lead_contacts" ON public.lead_contacts;
DROP POLICY IF EXISTS "Allow all users to update lead_contacts" ON public.lead_contacts;
DROP POLICY IF EXISTS "Allow all users to delete lead_contacts" ON public.lead_contacts;
CREATE POLICY "auth_select_lead_contacts" ON public.lead_contacts FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_insert_lead_contacts" ON public.lead_contacts FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth_update_lead_contacts" ON public.lead_contacts FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_delete_lead_contacts" ON public.lead_contacts FOR DELETE TO authenticated USING (true);

-- ============ lead_activities ============
DROP POLICY IF EXISTS "Authenticated users can read lead activities"   ON public.lead_activities;
DROP POLICY IF EXISTS "Authenticated users can insert lead activities" ON public.lead_activities;
DROP POLICY IF EXISTS "Authenticated users can update lead activities" ON public.lead_activities;
DROP POLICY IF EXISTS "Authenticated users can delete lead activities" ON public.lead_activities;
CREATE POLICY "auth_select_lead_activities" ON public.lead_activities FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_insert_lead_activities" ON public.lead_activities FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth_update_lead_activities" ON public.lead_activities FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_delete_lead_activities" ON public.lead_activities FOR DELETE TO authenticated USING (true);

-- ============ sales_agenda ============
DROP POLICY IF EXISTS "Allow all for authenticated users" ON public.sales_agenda;
CREATE POLICY "auth_all_sales_agenda" ON public.sales_agenda FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============ sent_emails ============
DROP POLICY IF EXISTS "Anyone can see sent emails"   ON public.sent_emails;
DROP POLICY IF EXISTS "Users can insert sent emails" ON public.sent_emails;
DROP POLICY IF EXISTS "Users can update sent emails" ON public.sent_emails;
CREATE POLICY "auth_select_sent_emails" ON public.sent_emails FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_insert_sent_emails" ON public.sent_emails FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth_update_sent_emails" ON public.sent_emails FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- ============ team_members ============
-- SELECT only voor authenticated. INSERT/UPDATE blijven service-role-only
-- via /api/team/invite (LCN-002).
DROP POLICY IF EXISTS "Authenticated users can read team members" ON public.team_members;
DROP POLICY IF EXISTS "Allow insert for team members"             ON public.team_members;
DROP POLICY IF EXISTS "Allow update for team members"             ON public.team_members;
CREATE POLICY "auth_select_team_members" ON public.team_members FOR SELECT TO authenticated USING (true);

-- ============ customers ============
DROP POLICY IF EXISTS "Allow all" ON public.customers;
CREATE POLICY "auth_all_customers" ON public.customers FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============ content_briefs ============
DROP POLICY IF EXISTS "Authenticated users can manage content briefs" ON public.content_briefs;
CREATE POLICY "auth_all_content_briefs" ON public.content_briefs FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============ content_templates ============
DROP POLICY IF EXISTS "Authenticated users can manage content templates" ON public.content_templates;
CREATE POLICY "auth_all_content_templates" ON public.content_templates FOR ALL TO authenticated USING (true) WITH CHECK (true);
