import { createBrowserClient } from '@supabase/ssr'

// Use placeholder values during build when env vars are not available
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key'

// Create a single supabase client for browser-side usage
export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey)

// Type definitions for database tables
export interface Studio {
  id: string
  owner_id?: string
  host_id?: string
  title: string
  description?: string
  short_description?: string
  type: string
  location: string
  address?: string
  city?: string
  country?: string
  latitude?: number
  longitude?: number
  price_per_hour: number
  hourly_rate?: number
  capacity?: number
  size_sqm?: number
  images?: string[]
  amenities?: string[]
  rules?: string[]
  is_featured?: boolean
  is_instant_book?: boolean
  is_published?: boolean
  rating?: number
  avg_rating?: number
  review_count?: number
  total_reviews?: number
  status?: string
  check_in_time?: string
  check_out_time?: string
  minimum_hours?: number
  maximum_hours?: number
  cancellation_policy?: string
  wifi_network_name?: string
  wifi_password?: string
  entry_code?: string
  access_instructions?: string
  parking_info?: string
  created_at?: string
  updated_at?: string
}

export interface Partner {
  id: string
  user_id?: string
  company_name: string
  contact_name: string
  email: string
  phone?: string
  address?: string
  city?: string
  country?: string
  kvk_number?: string
  btw_number?: string
  bank_account_name?: string
  bank_iban?: string
  bank_bic?: string
  commission_rate?: number
  status: 'pending' | 'active' | 'inactive' | 'suspended'
  tier: 'standard' | 'premium' | 'enterprise'
  studios_count?: number
  total_revenue?: number
  total_payouts?: number
  avatar_url?: string
  notes?: string
  contract_signed_at?: string
  onboarding_completed_at?: string
  created_at?: string
  updated_at?: string
}

export interface Customer {
  id: string
  user_id?: string
  full_name: string
  email: string
  phone?: string
  company?: string
  total_bookings: number
  total_spent: number
  created_at?: string
  updated_at?: string
}

export interface Transaction {
  id: string
  booking_id?: string
  partner_id?: string
  type: string
  amount: number
  description?: string
  status: string
  created_at?: string
}

export interface SalesLead {
  id: string
  company_name: string
  contact_name?: string
  email?: string
  phone?: string
  city?: string
  address?: string
  website?: string
  status: 'cold' | 'warm' | 'hot' | 'negotiation' | 'closed' | 'lost'
  source?: string
  notes?: string
  assigned_to?: string
  created_at?: string
  updated_at?: string
  // Enrichment fields
  instagram?: string
  facebook?: string
  linkedin?: string
  twitter?: string
  enriched?: boolean
  enriched_at?: string
  enrichment_error?: string
}

export interface LeadContact {
  id: string
  lead_id: string
  name: string
  role?: string
  email?: string
  phone?: string
  is_primary?: boolean
  created_at?: string
  updated_at?: string
}

export interface MarketingPost {
  id: string
  title: string
  content?: string
  platform?: string
  scheduled_at?: string
  published_at?: string
  status: string
  created_at?: string
}

export interface Document {
  id: string
  name: string
  type?: string
  file_url?: string
  partner_id?: string
  created_at?: string
}

export interface Booking {
  id: string
  studio_id?: string
  user_id?: string
  renter_id?: string
  host_id?: string
  booking_number?: string
  start_time?: string
  end_time?: string
  start_datetime?: string
  end_datetime?: string
  total_hours?: number
  total_price?: number
  total_amount?: number
  service_fee?: number
  host_payout?: number
  equipment_total?: number
  status?: string
  payment_status?: string
  production_type?: string
  notes?: string
  special_requests?: string
  stripe_payment_id?: string
  stripe_checkout_session_id?: string
  cancellation_reason?: string
  cancelled_by?: string
  cancelled_at?: string
  created_at?: string
  updated_at?: string
}

// Studio API functions
export const studiosApi = {
  async getAll() {
    const { data, error } = await supabase
      .from('studios')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error
    return data as Studio[]
  },

  async getById(id: string) {
    const { data, error } = await supabase
      .from('studios')
      .select('*')
      .eq('id', id)
      .single()

    if (error) throw error
    return data as Studio
  },

  async create(studio: Partial<Studio>) {
    const { data, error } = await supabase
      .from('studios')
      .insert(studio)
      .select()
      .single()

    if (error) throw error
    return data as Studio
  },

  async update(id: string, studio: Partial<Studio>) {
    const { data, error } = await supabase
      .from('studios')
      .update(studio)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data as Studio
  },

  async delete(id: string) {
    const { error } = await supabase
      .from('studios')
      .delete()
      .eq('id', id)

    if (error) throw error
  }
}

// Partners API functions
export const partnersApi = {
  async getAll() {
    const { data, error } = await supabase
      .from('partners')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error
    return data as Partner[]
  },

  async getById(id: string) {
    const { data, error } = await supabase
      .from('partners')
      .select('*')
      .eq('id', id)
      .single()

    if (error) throw error
    return data as Partner
  },

  async create(partner: Partial<Partner>) {
    const { data, error } = await supabase
      .from('partners')
      .insert(partner)
      .select()
      .single()

    if (error) throw error
    return data as Partner
  },

  async update(id: string, partner: Partial<Partner>) {
    const { data, error } = await supabase
      .from('partners')
      .update(partner)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data as Partner
  },

  async delete(id: string) {
    const { error } = await supabase
      .from('partners')
      .delete()
      .eq('id', id)

    if (error) throw error
  }
}

// Customers API functions (linked to profiles/users)
export const customersApi = {
  async getAll() {
    try {
      // First try customers table
      const { data: customersData, error: customersError } = await supabase
        .from('customers')
        .select('*')
        .order('created_at', { ascending: false })

      if (!customersError && customersData && customersData.length > 0) {
        return customersData as Customer[]
      }

      // Fallback: use profiles table
      console.info('Customers table empty or error, falling back to profiles')
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false })

      if (profilesError) {
        console.warn('Profiles fetch error:', profilesError.message)
        return []
      }

      // Map profiles to customers format
      return (profilesData || []).map((p: { id: string; email: string | null; full_name: string | null; created_at: string }) => ({
        id: p.id,
        user_id: p.id,
        full_name: p.full_name || 'Unknown',
        email: p.email || '',
        phone: '',
        company: '',
        total_bookings: 0,
        total_spent: 0,
        created_at: p.created_at,
        updated_at: p.created_at,
      })) as Customer[]

    } catch (err) {
      console.warn('Customers fetch failed:', err)
      return []
    }
  },

  async getById(id: string) {
    try {
      // Try customers table first
      const { data: customerData, error: customerError } = await supabase
        .from('customers')
        .select('*')
        .eq('id', id)
        .single()

      if (!customerError && customerData) {
        return customerData as Customer
      }

      // Fallback: use profiles
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', id)
        .single()

      if (profileError || !profileData) {
        return null
      }

      return {
        id: profileData.id,
        user_id: profileData.id,
        full_name: profileData.full_name || 'Unknown',
        email: profileData.email || '',
        phone: '',
        company: '',
        total_bookings: 0,
        total_spent: 0,
        created_at: profileData.created_at,
        updated_at: profileData.created_at,
      } as Customer

    } catch (err) {
      console.warn('Customer fetch failed:', err)
      return null
    }
  },

  async create(customer: Partial<Customer>) {
    try {
      const { data, error } = await supabase
        .from('customers')
        .insert(customer)
        .select()
        .single()

      if (error) throw error
      return data as Customer
    } catch (err) {
      console.warn('Customer create failed:', err)
      throw err
    }
  },

  async update(id: string, customer: Partial<Customer>) {
    try {
      const { data, error } = await supabase
        .from('customers')
        .update(customer)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data as Customer
    } catch (err) {
      console.warn('Customer update failed:', err)
      throw err
    }
  },

  async delete(id: string) {
    try {
      const { error } = await supabase
        .from('customers')
        .delete()
        .eq('id', id)

      if (error) throw error
    } catch (err) {
      console.warn('Customer delete failed:', err)
      throw err
    }
  }
}

// Bookings API functions
export const bookingsApi = {
  async getAll() {
    const { data, error } = await supabase
      .from('bookings')
      .select(`
        *,
        studio:studios(id, title, location, images),
        customer:users!bookings_renter_id_fkey(id, full_name, email, avatar_url)
      `)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data
  },

  async getById(id: string) {
    const { data, error } = await supabase
      .from('bookings')
      .select(`
        *,
        studio:studios(*),
        customer:users!bookings_renter_id_fkey(*)
      `)
      .eq('id', id)
      .single()

    if (error) throw error
    return data
  },

  async updateStatus(id: string, status: string) {
    const { data, error } = await supabase
      .from('bookings')
      .update({ status })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  }
}

// Dashboard API functions
export const dashboardApi = {
  async getStats() {
    const [
      { count: studiosCount },
      { count: bookingsCount },
      { count: activeBookingsCount },
      { count: pendingBookingsCount },
      { count: partnersCount },
      { count: pendingPartnersCount },
      { count: usersCount },
      { data: revenueData },
      { data: payoutsData },
    ] = await Promise.all([
      supabase.from('studios').select('*', { count: 'exact', head: true }),
      supabase.from('bookings').select('*', { count: 'exact', head: true }),
      supabase.from('bookings').select('*', { count: 'exact', head: true }).in('status', ['confirmed', 'pending']),
      supabase.from('bookings').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase.from('partners').select('*', { count: 'exact', head: true }),
      supabase.from('partners').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase.from('users').select('*', { count: 'exact', head: true }),
      supabase.from('transactions').select('amount').eq('type', 'booking_revenue'),
      supabase.from('payouts').select('amount'),
    ])

    const totalRevenue = (revenueData || []).reduce((sum: number, t: { amount: number }) => sum + Number(t.amount), 0)
    const totalPayouts = (payoutsData || []).reduce((sum: number, p: { amount: number }) => sum + Number(p.amount), 0)

    return {
      studiosCount: studiosCount || 0,
      bookingsCount: bookingsCount || 0,
      activeBookingsCount: activeBookingsCount || 0,
      pendingBookingsCount: pendingBookingsCount || 0,
      partnersCount: partnersCount || 0,
      pendingPartnersCount: pendingPartnersCount || 0,
      usersCount: usersCount || 0,
      totalRevenue,
      totalPayouts,
    }
  },

  async getRecentBookings(limit = 5) {
    const { data, error } = await supabase
      .from('bookings')
      .select(`
        *,
        studio:studios(id, title, location),
        customer:users!bookings_renter_id_fkey(id, full_name, email)
      `)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) throw error
    return data || []
  },

  async getRecentPartners(limit = 5) {
    const { data, error } = await supabase
      .from('partners')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) throw error
    return data || []
  },

  async getStudios() {
    const { data, error } = await supabase
      .from('studios')
      .select('id, title, status')
      .order('created_at', { ascending: false })

    if (error) throw error
    return data || []
  },

  async getRecentTransactions(limit = 5) {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) throw error
    return data || []
  },
}

// Transactions API functions
export const transactionsApi = {
  async getAll() {
    const { data, error } = await supabase
      .from('transactions')
      .select(`
        *,
        partner:partners(id, company_name)
      `)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data as (Transaction & { partner?: { id: string; company_name: string } })[]
  },

  async getByPartner(partnerId: string) {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('partner_id', partnerId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data as Transaction[]
  },
}

// Sales Leads API functions
export const salesLeadsApi = {
  async getAll() {
    const { data, error } = await supabase
      .from('sales_leads')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error
    return data as SalesLead[]
  },

  async getById(id: string) {
    const { data, error } = await supabase
      .from('sales_leads')
      .select('*')
      .eq('id', id)
      .single()

    if (error) throw error
    return data as SalesLead
  },

  async create(lead: Partial<SalesLead>) {
    const { data, error } = await supabase
      .from('sales_leads')
      .insert(lead)
      .select()
      .single()

    if (error) throw error
    return data as SalesLead
  },

  async update(id: string, lead: Partial<SalesLead>) {
    const { data, error } = await supabase
      .from('sales_leads')
      .update(lead)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data as SalesLead
  },

  async delete(id: string) {
    const { error } = await supabase
      .from('sales_leads')
      .delete()
      .eq('id', id)

    if (error) throw error
  },

  async createMany(leads: Partial<SalesLead>[]) {
    const { data, error } = await supabase
      .from('sales_leads')
      .insert(leads)
      .select()

    if (error) throw error
    return data as SalesLead[]
  },
}

// Lead Contacts API functions
export const leadContactsApi = {
  async getByLeadId(leadId: string) {
    const { data, error } = await supabase
      .from('lead_contacts')
      .select('*')
      .eq('lead_id', leadId)
      .order('is_primary', { ascending: false })
      .order('created_at', { ascending: true })

    if (error) throw error
    return data as LeadContact[]
  },

  async create(contact: Partial<LeadContact>) {
    const { data, error } = await supabase
      .from('lead_contacts')
      .insert(contact)
      .select()
      .single()

    if (error) throw error
    return data as LeadContact
  },

  async update(id: string, contact: Partial<LeadContact>) {
    const { data, error } = await supabase
      .from('lead_contacts')
      .update(contact)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data as LeadContact
  },

  async delete(id: string) {
    const { error } = await supabase
      .from('lead_contacts')
      .delete()
      .eq('id', id)

    if (error) throw error
  },

  async createMany(contacts: Partial<LeadContact>[]) {
    const { data, error } = await supabase
      .from('lead_contacts')
      .insert(contacts)
      .select()

    if (error) throw error
    return data as LeadContact[]
  },
}

// Marketing API functions
export const marketingApi = {
  async getAll() {
    const { data, error } = await supabase
      .from('marketing_posts')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error
    return data as MarketingPost[]
  },

  async getById(id: string) {
    const { data, error } = await supabase
      .from('marketing_posts')
      .select('*')
      .eq('id', id)
      .single()

    if (error) throw error
    return data as MarketingPost
  },

  async create(post: Partial<MarketingPost>) {
    const { data, error } = await supabase
      .from('marketing_posts')
      .insert(post)
      .select()
      .single()

    if (error) throw error
    return data as MarketingPost
  },

  async update(id: string, post: Partial<MarketingPost>) {
    const { data, error } = await supabase
      .from('marketing_posts')
      .update(post)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data as MarketingPost
  },

  async delete(id: string) {
    const { error } = await supabase
      .from('marketing_posts')
      .delete()
      .eq('id', id)

    if (error) throw error
  },
}

// Documents API functions
export const documentsApi = {
  async getAll() {
    const { data, error } = await supabase
      .from('documents')
      .select(`
        *,
        partner:partners(id, company_name)
      `)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data as (Document & { partner?: { id: string; company_name: string } })[]
  },

  async getByPartner(partnerId: string) {
    const { data, error } = await supabase
      .from('documents')
      .select('*')
      .eq('partner_id', partnerId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data as Document[]
  },

  async create(doc: Partial<Document>) {
    const { data, error } = await supabase
      .from('documents')
      .insert(doc)
      .select()
      .single()

    if (error) throw error
    return data as Document
  },

  async delete(id: string) {
    const { error } = await supabase
      .from('documents')
      .delete()
      .eq('id', id)

    if (error) throw error
  },
}

// Finance API functions
export const financeApi = {
  async getRevenueByStudio() {
    const { data, error } = await supabase
      .from('bookings')
      .select(`
        subtotal,
        studio:studios(id, name)
      `)

    if (error) throw error

    const revenueMap: Record<string, { name: string; revenue: number }> = {}
    for (const booking of data || []) {
      const studio = booking.studio as unknown as { id: string; name: string } | null
      const studioName = studio?.name || 'Onbekend'
      const studioId = studio?.id || 'unknown'
      if (!revenueMap[studioId]) {
        revenueMap[studioId] = { name: studioName, revenue: 0 }
      }
      revenueMap[studioId].revenue += Number(booking.subtotal) || 0
    }

    const entries = Object.values(revenueMap).sort((a, b) => b.revenue - a.revenue)
    const total = entries.reduce((sum, e) => sum + e.revenue, 0)
    return entries.map(e => ({
      ...e,
      percentage: total > 0 ? Math.round((e.revenue / total) * 100) : 0,
    }))
  },

  async getOverview() {
    const [
      { data: transactionsData },
      { data: bookingsData },
    ] = await Promise.all([
      supabase.from('transactions').select('amount, type, status'),
      supabase.from('bookings').select('subtotal, platform_fee, partner_payout'),
    ])

    const totalRevenue = (bookingsData || []).reduce((sum, b) => sum + (Number(b.subtotal) || 0), 0)
    const platformFees = (bookingsData || []).reduce((sum, b) => sum + (Number(b.platform_fee) || 0), 0)
    const partnerPayouts = (bookingsData || []).reduce((sum, b) => sum + (Number(b.partner_payout) || 0), 0)
    const pendingPayouts = (transactionsData || [])
      .filter(t => t.status === 'pending')
      .reduce((sum, t) => sum + (Number(t.amount) || 0), 0)

    return { totalRevenue, platformFees, partnerPayouts, pendingPayouts }
  },
}

// Analytics API functions
export const analyticsApi = {
  async getBookingTrends() {
    const { data, error } = await supabase
      .from('bookings')
      .select('created_at')
      .order('created_at', { ascending: true })

    if (error) throw error

    const monthCounts: Record<string, number> = {}
    for (const booking of data || []) {
      const date = new Date(booking.created_at)
      const key = date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
      monthCounts[key] = (monthCounts[key] || 0) + 1
    }

    return Object.entries(monthCounts).map(([month, bookings]) => ({ month, bookings }))
  },

  async getStudioTypeDistribution() {
    const { data, error } = await supabase
      .from('studios')
      .select('type')

    if (error) throw error

    const typeCounts: Record<string, number> = {}
    for (const studio of data || []) {
      const type = studio.type || 'Other'
      typeCounts[type] = (typeCounts[type] || 0) + 1
    }

    const colors = ['#6366F1', '#F97316', '#10B981', '#F59E0B', '#EC4899', '#8B5CF6', '#06B6D4']
    return Object.entries(typeCounts).map(([name, value], i) => ({
      name,
      value,
      color: colors[i % colors.length],
    }))
  },

  async getTopStudios() {
    const { data, error } = await supabase
      .from('bookings')
      .select(`
        subtotal,
        studio:studios(id, name)
      `)

    if (error) throw error

    const studioMap: Record<string, { name: string; bookings: number; revenue: number }> = {}
    for (const booking of data || []) {
      const studio = booking.studio as unknown as { id: string; name: string } | null
      const studioId = studio?.id || 'unknown'
      const studioName = studio?.name || 'Onbekend'
      if (!studioMap[studioId]) {
        studioMap[studioId] = { name: studioName, bookings: 0, revenue: 0 }
      }
      studioMap[studioId].bookings += 1
      studioMap[studioId].revenue += Number(booking.subtotal) || 0
    }

    return Object.values(studioMap).sort((a, b) => b.revenue - a.revenue).slice(0, 5)
  },

  async getRatingTrend() {
    const { data, error } = await supabase
      .from('studios')
      .select('rating')

    if (error) throw error

    const avgRating = (data || []).length > 0
      ? (data || []).reduce((sum, s) => sum + (Number(s.rating) || 0), 0) / (data || []).length
      : 0

    return { avgRating: Math.round(avgRating * 10) / 10 }
  },

  async getOverviewStats() {
    const [
      { count: totalBookings },
      { count: totalStudios },
      { count: totalCustomers },
      { data: revenueData },
    ] = await Promise.all([
      supabase.from('bookings').select('*', { count: 'exact', head: true }),
      supabase.from('studios').select('*', { count: 'exact', head: true }),
      supabase.from('customers').select('*', { count: 'exact', head: true }),
      supabase.from('bookings').select('subtotal'),
    ])

    const totalRevenue = (revenueData || []).reduce((sum, b) => sum + (Number(b.subtotal) || 0), 0)

    return {
      totalBookings: totalBookings || 0,
      totalStudios: totalStudios || 0,
      totalCustomers: totalCustomers || 0,
      totalRevenue,
    }
  },
}

// Profiles API (for user info)
export const profilesApi = {
  async getCurrent() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (error) return null
    return data as { id: string; email: string | null; full_name: string | null; avatar_url: string | null; role: string }
  },
}
// New interfaces for Email, Invoices, Contracts, and Sequences

export interface EmailAccount {
  id: string
  user_id: string
  email: string
  name?: string
  provider: 'gmail' | 'outlook' | 'imap'
  imap_host?: string
  imap_port?: number
  smtp_host?: string
  smtp_port?: number
  username?: string
  password_encrypted?: string
  is_connected: boolean
  last_sync_at?: string
  created_at: string
  updated_at: string
}

export interface Email {
  id: string
  account_id: string
  message_id?: string
  thread_id?: string
  folder: 'inbox' | 'sent' | 'drafts' | 'trash' | 'spam' | 'archive'
  subject?: string
  from_name?: string
  from_email: string
  to_emails: { name?: string; email: string }[]
  cc_emails?: { name?: string; email: string }[]
  bcc_emails?: { name?: string; email: string }[]
  body_text?: string
  body_html?: string
  is_read: boolean
  is_starred: boolean
  attachments?: { filename: string; size: number; content_type: string; url?: string }[]
  sent_at?: string
  received_at?: string
  created_at: string
  updated_at: string
}

export interface EmailTemplate {
  id: string
  user_id: string
  name: string
  subject: string
  body: string
  is_shared: boolean
  created_at: string
  updated_at: string
}

export interface EmailSequence {
  id: string
  user_id: string
  name: string
  description?: string
  status: 'draft' | 'active' | 'paused'
  emails?: SequenceEmail[]
  created_at: string
  updated_at: string
}

export interface SequenceEmail {
  id: string
  sequence_id: string
  subject: string
  body: string
  delay_days: number
  order_index: number
  created_at: string
  updated_at: string
}

export interface SequenceEnrollment {
  id: string
  sequence_id: string
  lead_id: string
  current_step: number
  status: 'active' | 'completed' | 'bounced' | 'unsubscribed'
  started_at: string
  completed_at?: string
  next_send_at?: string
  created_at: string
  updated_at: string
}

export interface SequenceEmailLog {
  id: string
  enrollment_id: string
  sequence_email_id: string
  subject?: string
  body?: string
  sent_at: string
  opened_at?: string
  clicked_at?: string
  status: 'sent' | 'delivered' | 'bounced' | 'failed'
}

export interface Invoice {
  id: string
  user_id: string
  invoice_number: string
  customer_name: string
  customer_email: string
  customer_company?: string
  customer_address?: string
  subtotal: number
  tax_rate: number
  tax_amount: number
  total: number
  currency: string
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled'
  issue_date: string
  due_date: string
  paid_at?: string
  notes?: string
  pdf_url?: string
  items?: InvoiceItem[]
  created_at: string
  updated_at: string
}

export interface InvoiceItem {
  id: string
  invoice_id: string
  description: string
  quantity: number
  unit_price: number
  total: number
  created_at: string
}

export interface Contract {
  id: string
  user_id: string
  title: string
  description?: string
  customer_name: string
  customer_email: string
  customer_company?: string
  file_url?: string
  file_name?: string
  status: 'draft' | 'sent' | 'viewed' | 'signed' | 'expired' | 'cancelled'
  created_at: string
  sent_at?: string
  viewed_at?: string
  signed_at?: string
  expires_at?: string
  signature_url?: string
  updated_at: string
}

export interface EmailTracking {
  id: string
  email_id: string
  tracking_type: 'open' | 'click'
  ip_address?: string
  user_agent?: string
  link_url?: string
  tracked_at: string
}

// Email Accounts API
export const emailAccountsApi = {
  async getAll() {
    const { data, error } = await supabase
      .from('email_accounts')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error
    return data as EmailAccount[]
  },

  async create(account: Partial<EmailAccount>) {
    const { data, error } = await supabase
      .from('email_accounts')
      .insert(account)
      .select()
      .single()

    if (error) throw error
    return data as EmailAccount
  },

  async update(id: string, account: Partial<EmailAccount>) {
    const { data, error } = await supabase
      .from('email_accounts')
      .update(account)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data as EmailAccount
  },

  async delete(id: string) {
    const { error } = await supabase
      .from('email_accounts')
      .delete()
      .eq('id', id)

    if (error) throw error
  }
}

// Emails API
export const emailsApi = {
  async getByFolder(accountId: string, folder: string) {
    const { data, error } = await supabase
      .from('emails')
      .select('*')
      .eq('account_id', accountId)
      .eq('folder', folder)
      .order('received_at', { ascending: false })

    if (error) throw error
    return data as Email[]
  },

  async getById(id: string) {
    const { data, error } = await supabase
      .from('emails')
      .select('*')
      .eq('id', id)
      .single()

    if (error) throw error
    return data as Email
  },

  async create(email: Partial<Email>) {
    const { data, error } = await supabase
      .from('emails')
      .insert(email)
      .select()
      .single()

    if (error) throw error
    return data as Email
  },

  async update(id: string, email: Partial<Email>) {
    const { data, error } = await supabase
      .from('emails')
      .update(email)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data as Email
  },

  async markAsRead(id: string) {
    return this.update(id, { is_read: true })
  },

  async toggleStar(id: string, isStarred: boolean) {
    return this.update(id, { is_starred: isStarred })
  },

  async moveToFolder(id: string, folder: string) {
    return this.update(id, { folder: folder as any })
  },

  async delete(id: string) {
    const { error } = await supabase
      .from('emails')
      .delete()
      .eq('id', id)

    if (error) throw error
  }
}

// Email Templates API
export const emailTemplatesApi = {
  async getAll() {
    const { data, error } = await supabase
      .from('email_templates')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error
    return data as EmailTemplate[]
  },

  async create(template: Partial<EmailTemplate>) {
    const { data, error } = await supabase
      .from('email_templates')
      .insert(template)
      .select()
      .single()

    if (error) throw error
    return data as EmailTemplate
  },

  async update(id: string, template: Partial<EmailTemplate>) {
    const { data, error } = await supabase
      .from('email_templates')
      .update(template)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data as EmailTemplate
  },

  async delete(id: string) {
    const { error } = await supabase
      .from('email_templates')
      .delete()
      .eq('id', id)

    if (error) throw error
  }
}

// Email Sequences API
export const emailSequencesApi = {
  async getAll() {
    const { data, error } = await supabase
      .from('email_sequences')
      .select(`
        *,
        emails:sequence_emails(*)
      `)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data as EmailSequence[]
  },

  async getById(id: string) {
    const { data, error } = await supabase
      .from('email_sequences')
      .select(`
        *,
        emails:sequence_emails(*),
        enrollments:sequence_enrollments(count)
      `)
      .eq('id', id)
      .single()

    if (error) throw error
    return data as EmailSequence
  },

  async create(sequence: Partial<EmailSequence>, emails: Partial<SequenceEmail>[]) {
    const { data: sequenceData, error: sequenceError } = await supabase
      .from('email_sequences')
      .insert(sequence)
      .select()
      .single()

    if (sequenceError) throw sequenceError

    if (emails.length > 0) {
      const { error: emailsError } = await supabase
        .from('sequence_emails')
        .insert(emails.map((e, i) => ({
          ...e,
          sequence_id: sequenceData.id,
          order_index: i,
        })))

      if (emailsError) throw emailsError
    }

    return sequenceData as EmailSequence
  },

  async update(id: string, sequence: Partial<EmailSequence>) {
    const { data, error } = await supabase
      .from('email_sequences')
      .update(sequence)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data as EmailSequence
  },

  async delete(id: string) {
    const { error } = await supabase
      .from('email_sequences')
      .delete()
      .eq('id', id)

    if (error) throw error
  },

  // Sequence Emails
  async addSequenceEmail(sequenceEmail: Partial<SequenceEmail>) {
    const { data, error } = await supabase
      .from('sequence_emails')
      .insert(sequenceEmail)
      .select()
      .single()

    if (error) throw error
    return data as SequenceEmail
  },

  async updateSequenceEmail(id: string, sequenceEmail: Partial<SequenceEmail>) {
    const { data, error } = await supabase
      .from('sequence_emails')
      .update(sequenceEmail)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data as SequenceEmail
  },

  async deleteSequenceEmail(id: string) {
    const { error } = await supabase
      .from('sequence_emails')
      .delete()
      .eq('id', id)

    if (error) throw error
  },

  // Enrollments
  async enrollLead(sequenceId: string, leadId: string) {
    const { data, error } = await supabase
      .from('sequence_enrollments')
      .insert({
        sequence_id: sequenceId,
        lead_id: leadId,
        current_step: 0,
        status: 'active',
      })
      .select()
      .single()

    if (error) throw error
    return data as SequenceEnrollment
  },

  async getEnrollments(sequenceId: string) {
    const { data, error } = await supabase
      .from('sequence_enrollments')
      .select(`
        *,
        lead:sales_leads(*)
      `)
      .eq('sequence_id', sequenceId)

    if (error) throw error
    return data as SequenceEnrollment[]
  },

  async updateEnrollment(id: string, enrollment: Partial<SequenceEnrollment>) {
    const { data, error } = await supabase
      .from('sequence_enrollments')
      .update(enrollment)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data as SequenceEnrollment
  }
}

// Invoices API
export const invoicesApi = {
  async getAll() {
    const { data, error } = await supabase
      .from('invoices')
      .select(`
        *,
        items:invoice_items(*)
      `)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data as Invoice[]
  },

  async getById(id: string) {
    const { data, error } = await supabase
      .from('invoices')
      .select(`
        *,
        items:invoice_items(*)
      `)
      .eq('id', id)
      .single()

    if (error) throw error
    return data as Invoice
  },

  async create(invoice: Partial<Invoice>, items: Partial<InvoiceItem>[]) {
    const { data: invoiceData, error: invoiceError } = await supabase
      .from('invoices')
      .insert(invoice)
      .select()
      .single()

    if (invoiceError) throw invoiceError

    if (items.length > 0) {
      const { error: itemsError } = await supabase
        .from('invoice_items')
        .insert(items.map(item => ({
          ...item,
          invoice_id: invoiceData.id,
        })))

      if (itemsError) throw itemsError
    }

    return invoiceData as Invoice
  },

  async update(id: string, invoice: Partial<Invoice>, items?: Partial<InvoiceItem>[]) {
    const { data, error } = await supabase
      .from('invoices')
      .update(invoice)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    if (items) {
      // Delete existing items
      await supabase.from('invoice_items').delete().eq('invoice_id', id)
      
      // Insert new items
      if (items.length > 0) {
        await supabase.from('invoice_items').insert(items.map(item => ({
          ...item,
          invoice_id: id,
        })))
      }
    }

    return data as Invoice
  },

  async markAsPaid(id: string) {
    return this.update(id, {
      status: 'paid',
      paid_at: new Date().toISOString(),
    })
  },

  async delete(id: string) {
    const { error } = await supabase
      .from('invoices')
      .delete()
      .eq('id', id)

    if (error) throw error
  },

  async getStats() {
    const { data, error } = await supabase
      .from('invoices')
      .select('status, total')

    if (error) throw error

    const stats = {
      total: data?.length || 0,
      paid: 0,
      outstanding: 0,
      overdue: 0,
      revenue: 0,
      outstandingAmount: 0,
    }

    for (const invoice of data || []) {
      if (invoice.status === 'paid') {
        stats.paid++
        stats.revenue += Number(invoice.total) || 0
      }
      if (invoice.status === 'sent' || invoice.status === 'overdue') {
        stats.outstanding++
        stats.outstandingAmount += Number(invoice.total) || 0
      }
      if (invoice.status === 'overdue') {
        stats.overdue++
      }
    }

    return stats
  }
}

// Contracts API
export const contractsApi = {
  async getAll() {
    const { data, error } = await supabase
      .from('contracts')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error
    return data as Contract[]
  },

  async getById(id: string) {
    const { data, error } = await supabase
      .from('contracts')
      .select('*')
      .eq('id', id)
      .single()

    if (error) throw error
    return data as Contract
  },

  async create(contract: Partial<Contract>) {
    const { data, error } = await supabase
      .from('contracts')
      .insert(contract)
      .select()
      .single()

    if (error) throw error
    return data as Contract
  },

  async update(id: string, contract: Partial<Contract>) {
    const { data, error } = await supabase
      .from('contracts')
      .update(contract)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data as Contract
  },

  async send(id: string) {
    return this.update(id, {
      status: 'sent',
      sent_at: new Date().toISOString(),
    })
  },

  async markAsViewed(id: string) {
    return this.update(id, {
      status: 'viewed',
      viewed_at: new Date().toISOString(),
    })
  },

  async markAsSigned(id: string, signatureUrl?: string) {
    return this.update(id, {
      status: 'signed',
      signed_at: new Date().toISOString(),
      signature_url: signatureUrl,
    })
  },

  async cancel(id: string) {
    return this.update(id, { status: 'cancelled' })
  },

  async delete(id: string) {
    const { error } = await supabase
      .from('contracts')
      .delete()
      .eq('id', id)

    if (error) throw error
  },

  async getStats() {
    const { data, error } = await supabase
      .from('contracts')
      .select('status')

    if (error) throw error

    return {
      total: data?.length || 0,
      signed: data?.filter(c => c.status === 'signed').length || 0,
      pending: data?.filter(c => c.status === 'sent' || c.status === 'viewed').length || 0,
      draft: data?.filter(c => c.status === 'draft').length || 0,
      expired: data?.filter(c => c.status === 'expired').length || 0,
    }
  }
}

// Email Tracking API
export const emailTrackingApi = {
  async trackOpen(emailId: string, ipAddress?: string, userAgent?: string) {
    const { error } = await supabase
      .from('email_tracking')
      .insert({
        email_id: emailId,
        tracking_type: 'open',
        ip_address: ipAddress,
        user_agent: userAgent,
      })

    if (error) throw error
  },

  async trackClick(emailId: string, linkUrl: string, ipAddress?: string, userAgent?: string) {
    const { error } = await supabase
      .from('email_tracking')
      .insert({
        email_id: emailId,
        tracking_type: 'click',
        link_url: linkUrl,
        ip_address: ipAddress,
        user_agent: userAgent,
      })

    if (error) throw error
  },

  async getStats(emailId: string) {
    const { data, error } = await supabase
      .from('email_tracking')
      .select('*')
      .eq('email_id', emailId)

    if (error) throw error

    return {
      opens: data?.filter(t => t.tracking_type === 'open').length || 0,
      clicks: data?.filter(t => t.tracking_type === 'click').length || 0,
      uniqueOpens: new Set(data?.filter(t => t.tracking_type === 'open').map(t => t.ip_address)).size || 0,
    }
  }
}
