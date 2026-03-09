'use client'

import { useState } from 'react'
import {
  Search,
  Plus,
  Building2,
  MapPin,
  Mail,
  Phone,
  Users,
  DollarSign,
  Briefcase,
  Globe,
  Eye,
  MoreHorizontal,
  ChevronDown,
  Check,
  Sparkles,
  RefreshCw,
  Download,
  Filter,
  X,
  Linkedin,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

// Mock Apollo prospects with more details
const mockProspects = [
  {
    id: '1',
    company: 'Luminous Photo Studio',
    contact: 'Jennifer Adams',
    title: 'Owner & Lead Photographer',
    email: 'jennifer@luminousphoto.com',
    phone: '+1 (415) 555-1234',
    linkedin: 'linkedin.com/in/jenniferadams',
    city: 'San Francisco, CA',
    type: 'Photo Studio',
    industry: 'Photography',
    employees: '5-10',
    revenue: '$500K - $1M',
    website: 'luminousphoto.com',
    match: 94,
    verified: true,
  },
  {
    id: '2',
    company: 'SoundWave Recording',
    contact: 'Marcus Thompson',
    title: 'Studio Manager',
    email: 'marcus@soundwave.com',
    phone: '+1 (323) 555-5678',
    linkedin: 'linkedin.com/in/marcusthompson',
    city: 'Los Angeles, CA',
    type: 'Music Studio',
    industry: 'Music Production',
    employees: '10-20',
    revenue: '$1M - $5M',
    website: 'soundwaverecording.com',
    match: 91,
    verified: true,
  },
  {
    id: '3',
    company: 'Velocity Video Productions',
    contact: 'Samantha Park',
    title: 'Creative Director',
    email: 'sam@velocityvideo.com',
    phone: '+1 (206) 555-9012',
    linkedin: 'linkedin.com/in/samanthapark',
    city: 'Seattle, WA',
    type: 'Video Studio',
    industry: 'Video Production',
    employees: '5-10',
    revenue: '$500K - $1M',
    website: 'velocityvideo.com',
    match: 88,
    verified: false,
  },
  {
    id: '4',
    company: 'The Podcast Room',
    contact: 'Brandon Lee',
    title: 'Founder',
    email: 'brandon@podcastroom.com',
    phone: '+1 (720) 555-3456',
    linkedin: 'linkedin.com/in/brandonlee',
    city: 'Denver, CO',
    type: 'Podcast Studio',
    industry: 'Media & Broadcasting',
    employees: '1-5',
    revenue: '$100K - $500K',
    website: 'podcastroom.co',
    match: 86,
    verified: true,
  },
  {
    id: '5',
    company: 'Artisan Event Space',
    contact: 'Michelle Rivera',
    title: 'Events Director',
    email: 'michelle@artisanevents.com',
    phone: '+1 (602) 555-7890',
    linkedin: 'linkedin.com/in/michellerivera',
    city: 'Phoenix, AZ',
    type: 'Event Space',
    industry: 'Events & Hospitality',
    employees: '10-20',
    revenue: '$1M - $5M',
    website: 'artisanevents.com',
    match: 82,
    verified: true,
  },
  {
    id: '6',
    company: 'Brooklyn Beat Studio',
    contact: 'James Wilson',
    title: 'Head Engineer',
    email: 'james@brooklynbeat.com',
    phone: '+1 (718) 555-2468',
    linkedin: 'linkedin.com/in/jameswilson',
    city: 'New York, NY',
    type: 'Music Studio',
    industry: 'Music Production',
    employees: '5-10',
    revenue: '$500K - $1M',
    website: 'brooklynbeat.com',
    match: 79,
    verified: false,
  },
]

const locations = [
  'Los Angeles, CA',
  'New York, NY',
  'San Francisco, CA',
  'Seattle, WA',
  'Denver, CO',
  'Phoenix, AZ',
  'Austin, TX',
  'Miami, FL',
  'Chicago, IL',
]

const industries = [
  'Photography',
  'Video Production',
  'Music Production',
  'Media & Broadcasting',
  'Events & Hospitality',
]

const companySizes = ['1-5', '5-10', '10-20', '20-50', '50+']

const revenueRanges = ['$0 - $100K', '$100K - $500K', '$500K - $1M', '$1M - $5M', '$5M+']

const jobTitles = ['Owner', 'Founder', 'Director', 'Manager', 'Lead']

interface ProspectCardProps {
  prospect: typeof mockProspects[0]
  selected: boolean
  onSelect: () => void
  onReveal: () => void
  revealed: boolean
}

function ProspectCard({ prospect, selected, onSelect, onReveal, revealed }: ProspectCardProps) {
  return (
    <div
      className={cn(
        'bg-white rounded-2xl border p-5 transition-all',
        selected ? 'border-gray-900 ring-2 ring-gray-200' : 'border-gray-100 hover:border-gray-200'
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-start gap-3">
          <button
            onClick={onSelect}
            className={cn(
              'w-5 h-5 rounded border-2 flex items-center justify-center transition-colors mt-0.5',
              selected
                ? 'bg-gray-900 border-gray-900'
                : 'border-gray-300 hover:border-gray-400'
            )}
          >
            {selected && <Check className="h-3 w-3 text-white" />}
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-gray-900">{prospect.company}</h3>
              {prospect.verified && (
                <Badge className="bg-emerald-100 text-emerald-700 text-xs">Verified</Badge>
              )}
            </div>
            <p className="text-sm text-gray-500">{prospect.contact} · {prospect.title}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-purple-50">
            <Sparkles className="h-3 w-3 text-purple-600" />
            <span className="text-xs font-medium text-purple-700">{prospect.match}% match</span>
          </div>
          <button className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
            <MoreHorizontal className="h-4 w-4 text-gray-400" />
          </button>
        </div>
      </div>

      {/* Company Info */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <MapPin className="h-4 w-4 text-gray-400" />
          <span>{prospect.city}</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Building2 className="h-4 w-4 text-gray-400" />
          <span>{prospect.type}</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Users className="h-4 w-4 text-gray-400" />
          <span>{prospect.employees} employees</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <DollarSign className="h-4 w-4 text-gray-400" />
          <span>{prospect.revenue}</span>
        </div>
      </div>

      {/* Contact Info */}
      {revealed ? (
        <div className="space-y-2 p-3 bg-gray-50 rounded-xl mb-4">
          <div className="flex items-center gap-2 text-sm">
            <Mail className="h-4 w-4 text-gray-400" />
            <a href={`mailto:${prospect.email}`} className="text-gray-900 hover:underline">
              {prospect.email}
            </a>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Phone className="h-4 w-4 text-gray-400" />
            <a href={`tel:${prospect.phone}`} className="text-gray-900 hover:underline">
              {prospect.phone}
            </a>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Linkedin className="h-4 w-4 text-gray-400" />
            <a href={`https://${prospect.linkedin}`} target="_blank" rel="noopener noreferrer" className="text-gray-900 hover:underline">
              {prospect.linkedin}
            </a>
          </div>
        </div>
      ) : (
        <button
          onClick={onReveal}
          className="w-full p-3 mb-4 rounded-xl border-2 border-dashed border-gray-200 text-gray-500 hover:border-gray-600 hover:text-gray-900 transition-colors flex items-center justify-center gap-2"
        >
          <Eye className="h-4 w-4" />
          <span className="text-sm font-medium">Reveal Contact Info</span>
        </button>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        <Button className="flex-1" size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Add to Pipeline
        </Button>
        <Button variant="outline" size="sm" asChild>
          <a href={`https://${prospect.website}`} target="_blank" rel="noopener noreferrer">
            <Globe className="h-4 w-4" />
          </a>
        </Button>
      </div>
    </div>
  )
}

interface FilterSectionProps {
  title: string
  icon: React.ReactNode
  options: string[]
  selected: string[]
  onChange: (selected: string[]) => void
}

function FilterSection({ title, icon, options, selected, onChange }: FilterSectionProps) {
  const [isExpanded, setIsExpanded] = useState(true)

  const toggleOption = (option: string) => {
    if (selected.includes(option)) {
      onChange(selected.filter((s) => s !== option))
    } else {
      onChange([...selected, option])
    }
  }

  return (
    <div className="border-b border-gray-100 pb-4 mb-4 last:border-0 last:pb-0 last:mb-0">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center justify-between w-full mb-3"
      >
        <div className="flex items-center gap-2">
          {icon}
          <span className="font-medium text-gray-900">{title}</span>
          {selected.length > 0 && (
            <Badge variant="secondary" className="text-xs">{selected.length}</Badge>
          )}
        </div>
        <ChevronDown
          className={cn(
            'h-4 w-4 text-gray-400 transition-transform',
            isExpanded && 'rotate-180'
          )}
        />
      </button>

      {isExpanded && (
        <div className="space-y-2">
          {options.map((option) => (
            <label
              key={option}
              className="flex items-center gap-2 cursor-pointer text-sm text-gray-600 hover:text-gray-900"
            >
              <input
                type="checkbox"
                checked={selected.includes(option)}
                onChange={() => toggleOption(option)}
                className="rounded border-gray-300 text-gray-900 focus:ring-gray-900"
              />
              <span>{option}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  )
}

export default function ApolloPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedLocations, setSelectedLocations] = useState<string[]>([])
  const [selectedIndustries, setSelectedIndustries] = useState<string[]>([])
  const [selectedSizes, setSelectedSizes] = useState<string[]>([])
  const [selectedRevenue, setSelectedRevenue] = useState<string[]>([])
  const [selectedTitles, setSelectedTitles] = useState<string[]>([])
  const [selectedProspects, setSelectedProspects] = useState<string[]>([])
  const [revealedProspects, setRevealedProspects] = useState<string[]>([])

  const filteredProspects = mockProspects.filter((prospect) => {
    const matchesSearch =
      prospect.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
      prospect.contact.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesLocation =
      selectedLocations.length === 0 || selectedLocations.includes(prospect.city)
    const matchesIndustry =
      selectedIndustries.length === 0 || selectedIndustries.includes(prospect.industry)
    const matchesSize =
      selectedSizes.length === 0 || selectedSizes.includes(prospect.employees)
    const matchesRevenue =
      selectedRevenue.length === 0 || selectedRevenue.includes(prospect.revenue)

    return matchesSearch && matchesLocation && matchesIndustry && matchesSize && matchesRevenue
  })

  const toggleSelectProspect = (id: string) => {
    if (selectedProspects.includes(id)) {
      setSelectedProspects(selectedProspects.filter((p) => p !== id))
    } else {
      setSelectedProspects([...selectedProspects, id])
    }
  }

  const toggleRevealProspect = (id: string) => {
    if (!revealedProspects.includes(id)) {
      setRevealedProspects([...revealedProspects, id])
    }
  }

  const selectAll = () => {
    setSelectedProspects(filteredProspects.map((p) => p.id))
  }

  const clearSelection = () => {
    setSelectedProspects([])
  }

  const clearAllFilters = () => {
    setSelectedLocations([])
    setSelectedIndustries([])
    setSelectedSizes([])
    setSelectedRevenue([])
    setSelectedTitles([])
  }

  const hasActiveFilters =
    selectedLocations.length > 0 ||
    selectedIndustries.length > 0 ||
    selectedSizes.length > 0 ||
    selectedRevenue.length > 0 ||
    selectedTitles.length > 0

  return (
    <div className="flex gap-6 animate-fade-in">
      {/* Sidebar Filters */}
      <div className="w-72 flex-shrink-0">
        <div className="bg-white rounded-2xl border border-gray-100 p-5 sticky top-6">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <Filter className="h-5 w-5 text-gray-600" />
              <h2 className="font-semibold text-gray-900">Filters</h2>
            </div>
            {hasActiveFilters && (
              <button
                onClick={clearAllFilters}
                className="text-xs text-gray-900 hover:text-black font-medium"
              >
                Clear all
              </button>
            )}
          </div>

          <FilterSection
            title="Location"
            icon={<MapPin className="h-4 w-4 text-gray-400" />}
            options={locations}
            selected={selectedLocations}
            onChange={setSelectedLocations}
          />

          <FilterSection
            title="Industry"
            icon={<Briefcase className="h-4 w-4 text-gray-400" />}
            options={industries}
            selected={selectedIndustries}
            onChange={setSelectedIndustries}
          />

          <FilterSection
            title="Company Size"
            icon={<Users className="h-4 w-4 text-gray-400" />}
            options={companySizes}
            selected={selectedSizes}
            onChange={setSelectedSizes}
          />

          <FilterSection
            title="Revenue"
            icon={<DollarSign className="h-4 w-4 text-gray-400" />}
            options={revenueRanges}
            selected={selectedRevenue}
            onChange={setSelectedRevenue}
          />

          <FilterSection
            title="Job Titles"
            icon={<Briefcase className="h-4 w-4 text-gray-400" />}
            options={jobTitles}
            selected={selectedTitles}
            onChange={setSelectedTitles}
          />
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 min-w-0">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Apollo Prospecting</h1>
            <p className="text-gray-500">Find and reach out to studio owners</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Sync
            </Button>
            <Button size="sm">
              <Search className="h-4 w-4 mr-2" />
              New Search
            </Button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative mb-6">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <Input
            placeholder="Search by company name, contact, or keyword..."
            className="pl-12 h-12 text-base rounded-xl border-gray-200"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Results Count */}
        <div className="flex items-center justify-between mb-4">
          <div className="text-sm text-gray-600">
            <span className="font-medium text-gray-900">{filteredProspects.length}</span> results found
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={selectAll}
              className="text-sm text-gray-900 hover:text-black font-medium"
            >
              Select all
            </button>
            {selectedProspects.length > 0 && (
              <>
                <span className="text-gray-300">|</span>
                <button
                  onClick={clearSelection}
                  className="text-sm text-gray-500 hover:text-gray-700"
                >
                  Clear ({selectedProspects.length})
                </button>
              </>
            )}
          </div>
        </div>

        {/* Prospects Grid */}
        <div className="grid gap-4 md:grid-cols-2">
          {filteredProspects.map((prospect) => (
            <ProspectCard
              key={prospect.id}
              prospect={prospect}
              selected={selectedProspects.includes(prospect.id)}
              onSelect={() => toggleSelectProspect(prospect.id)}
              onReveal={() => toggleRevealProspect(prospect.id)}
              revealed={revealedProspects.includes(prospect.id)}
            />
          ))}
        </div>

        {filteredProspects.length === 0 && (
          <div className="text-center py-12 bg-gray-50 rounded-2xl">
            <Search className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No prospects found</h3>
            <p className="text-gray-500">Try adjusting your filters or search query</p>
          </div>
        )}
      </div>

      {/* Floating Bulk Actions Bar */}
      {selectedProspects.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-gray-900 text-white rounded-2xl px-6 py-4 shadow-2xl flex items-center gap-4 z-50">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gray-900 flex items-center justify-center text-sm font-medium">
              {selectedProspects.length}
            </div>
            <span className="font-medium">prospects selected</span>
          </div>

          <div className="w-px h-8 bg-gray-700" />

          <div className="flex items-center gap-2">
            <Button size="sm" variant="secondary" className="bg-white/10 hover:bg-white/20 text-white border-0">
              <Plus className="h-4 w-4 mr-2" />
              Add to Pipeline
            </Button>
            <Button size="sm" variant="secondary" className="bg-white/10 hover:bg-white/20 text-white border-0">
              <Mail className="h-4 w-4 mr-2" />
              Send Email
            </Button>
            <Button size="sm" variant="secondary" className="bg-white/10 hover:bg-white/20 text-white border-0">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>

          <button
            onClick={clearSelection}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors ml-2"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  )
}
