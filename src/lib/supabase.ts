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
