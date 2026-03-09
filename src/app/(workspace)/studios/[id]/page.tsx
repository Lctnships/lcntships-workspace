'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import {
  ChevronRight,
  MapPin,
  Edit,
  Eye,
  Plus,
  X,
  Star,
  Loader2,
  ExternalLink,
  DollarSign,
  Building2,
  ImageIcon,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { studiosApi, type Studio } from '@/lib/supabase'

const statusConfig: Record<string, { label: string; bgColor: string; textColor: string }> = {
  active: {
    label: 'Active',
    bgColor: 'bg-emerald-100',
    textColor: 'text-emerald-700',
  },
  inactive: {
    label: 'Inactive',
    bgColor: 'bg-gray-100',
    textColor: 'text-gray-700',
  },
  draft: {
    label: 'Draft',
    bgColor: 'bg-amber-100',
    textColor: 'text-amber-700',
  },
  published: {
    label: 'Published',
    bgColor: 'bg-emerald-100',
    textColor: 'text-emerald-700',
  },
}

// Add Space Modal
interface AddSpaceModalProps {
  isOpen: boolean
  onClose: () => void
}

function AddSpaceModal({ isOpen, onClose }: AddSpaceModalProps) {
  const [mounted, setMounted] = useState(false)
  const [spaceName, setSpaceName] = useState('')
  const [capacity, setCapacity] = useState('')
  const [size, setSize] = useState('')
  const [pricePerHour, setPricePerHour] = useState('')

   
  useEffect(() => {
    setMounted(true)
  }, [])

  const handleSubmit = () => {
    console.log({ spaceName, capacity, size, pricePerHour })
    onClose()
  }

  if (!isOpen || !mounted) return null

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-3xl w-full max-w-lg mx-4 overflow-hidden animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 className="text-xl font-bold text-gray-900">Add New Space</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-100 transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          <div className="flex flex-col gap-2">
            <label className="text-sm font-bold text-gray-900">Space Name</label>
            <Input
              placeholder="e.g. Recording Studio B"
              value={spaceName}
              onChange={(e) => setSpaceName(e.target.value)}
              className="h-12 rounded-xl"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-bold text-gray-900">Guest Capacity</label>
              <Input
                type="number"
                placeholder="0"
                value={capacity}
                onChange={(e) => setCapacity(e.target.value)}
                className="h-12 rounded-xl"
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-bold text-gray-900">Size (sqft)</label>
              <Input
                type="number"
                placeholder="0"
                value={size}
                onChange={(e) => setSize(e.target.value)}
                className="h-12 rounded-xl"
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-bold text-gray-900">Price per Hour ($)</label>
            <Input
              type="number"
              placeholder="0.00"
              value={pricePerHour}
              onChange={(e) => setPricePerHour(e.target.value)}
              className="h-12 rounded-xl"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-100 bg-gray-50">
          <Button variant="outline" onClick={onClose} className="rounded-full px-6">
            Cancel
          </Button>
          <Button onClick={handleSubmit} className="rounded-full px-6 shadow-lg shadow-gray-300">
            Add Space
          </Button>
        </div>
      </div>
    </div>,
    document.body
  )
}

export default function StudioDetailPage() {
  const params = useParams()
  const id = params.id as string

  const [studio, setStudio] = useState<Studio | null>(null)
  const [loading, setLoading] = useState(true)
  const [isAddSpaceModalOpen, setIsAddSpaceModalOpen] = useState(false)

  useEffect(() => {
    if (!id) return

    async function fetchStudio() {
      try {
        setLoading(true)
        const data = await studiosApi.getById(id)
        setStudio(data)
      } catch (err) {
        console.error('Failed to fetch studio:', err)
        setStudio(null)
      } finally {
        setLoading(false)
      }
    }

    fetchStudio()
  }, [id])

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-gray-900" />
          <p className="text-gray-500 font-medium">Loading studio...</p>
        </div>
      </div>
    )
  }

  // Not found state
  if (!studio) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center">
            <Building2 className="h-8 w-8 text-gray-400" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900">Studio Not Found</h2>
          <p className="text-gray-500 max-w-md">
            The studio you are looking for does not exist or may have been removed.
          </p>
          <Link href="/studios">
            <Button className="rounded-full px-6 mt-2">Back to Studios</Button>
          </Link>
        </div>
      </div>
    )
  }

  const status = statusConfig[studio.status || 'draft'] || statusConfig.draft
  const images = (studio.images || []) as string[]
  const hourlyRate = studio.hourly_rate ?? studio.price_per_hour ?? 0
  const amenities = (studio.amenities || []) as string[]

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Breadcrumbs */}
      <div className="flex items-center gap-2">
        <Link
          href="/studios"
          className="text-gray-500 text-sm font-medium hover:text-gray-900 transition-colors"
        >
          Studios
        </Link>
        <span className="text-gray-400 text-sm">/</span>
        <span className="text-gray-900 text-sm font-semibold">{studio.title}</span>
      </div>

      {/* Page Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <h1 className="text-4xl font-black tracking-tight text-gray-900">{studio.title}</h1>
            <span className={cn(
              'px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider',
              status.bgColor,
              status.textColor
            )}>
              {status.label}
            </span>
          </div>
          <div className="flex items-center gap-3 text-gray-500 text-lg">
            <span>{studio.type || 'Studio'}</span>
            {studio.rating && (
              <>
                <span>-</span>
                <span className="flex items-center gap-1">
                  <Star className="h-4 w-4 text-amber-400 fill-amber-400" />
                  {studio.rating}
                </span>
              </>
            )}
            {hourlyRate > 0 && (
              <>
                <span>-</span>
                <span className="flex items-center gap-1">
                  <DollarSign className="h-4 w-4" />
                  {hourlyRate}/hr
                </span>
              </>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <Button variant="outline" className="rounded-full h-11 px-6 gap-2">
            <Edit className="h-4 w-4" />
            Edit Studio
          </Button>
          <Button variant="outline" className="rounded-full h-11 px-6 gap-2">
            <Eye className="h-4 w-4" />
            Public Page
          </Button>
          <Button
            onClick={() => setIsAddSpaceModalOpen(true)}
            className="rounded-full h-11 px-6 gap-2 shadow-lg shadow-gray-300"
          >
            <Plus className="h-4 w-4" />
            Add Space
          </Button>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column */}
        <div className="lg:col-span-2 flex flex-col gap-8">
          {/* About Section */}
          <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
            <h3 className="text-xl font-bold text-gray-900 mb-6">About the Location</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="flex flex-col gap-4">
                {studio.description ? (
                  studio.description.split('\n\n').map((paragraph, index) => (
                    <p key={index} className="text-gray-600 leading-relaxed">{paragraph}</p>
                  ))
                ) : (
                  <p className="text-gray-400 italic">No description available for this studio.</p>
                )}
              </div>
              <div className="grid grid-cols-2 grid-rows-2 gap-3 h-64">
                {images.length > 0 ? (
                  <>
                    <div
                      className="bg-cover bg-center rounded-2xl col-span-2 row-span-1"
                      style={{ backgroundImage: `url(${images[0]})` }}
                    />
                    {images[1] ? (
                      <div
                        className="bg-cover bg-center rounded-2xl"
                        style={{ backgroundImage: `url(${images[1]})` }}
                      />
                    ) : (
                      <div className="bg-gray-100 rounded-2xl flex items-center justify-center">
                        <ImageIcon className="h-6 w-6 text-gray-300" />
                      </div>
                    )}
                    {images[2] ? (
                      <div
                        className="bg-cover bg-center rounded-2xl"
                        style={{ backgroundImage: `url(${images[2]})` }}
                      />
                    ) : (
                      <div className="bg-gray-100 rounded-2xl flex items-center justify-center">
                        <ImageIcon className="h-6 w-6 text-gray-300" />
                      </div>
                    )}
                  </>
                ) : (
                  <div className="col-span-2 row-span-2 bg-gray-100 rounded-2xl flex items-center justify-center">
                    <div className="flex flex-col items-center gap-2 text-gray-400">
                      <ImageIcon className="h-10 w-10" />
                      <span className="text-sm font-medium">No images</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Studio Details */}
          <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
            <h3 className="text-xl font-bold text-gray-900 mb-6">Studio Details</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
              <div className="flex flex-col gap-1">
                <span className="text-sm font-bold text-gray-400 uppercase tracking-wider">Type</span>
                <span className="text-gray-900 font-semibold">{studio.type || 'N/A'}</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-sm font-bold text-gray-400 uppercase tracking-wider">Hourly Rate</span>
                <span className="text-gray-900 font-semibold">
                  {hourlyRate > 0 ? `$${hourlyRate}/hr` : 'N/A'}
                </span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-sm font-bold text-gray-400 uppercase tracking-wider">Rating</span>
                <span className="text-gray-900 font-semibold flex items-center gap-1">
                  {studio.rating ? (
                    <>
                      <Star className="h-4 w-4 text-amber-400 fill-amber-400" />
                      {studio.rating}
                      {studio.total_reviews ? ` (${studio.total_reviews} reviews)` : ''}
                    </>
                  ) : (
                    'No ratings yet'
                  )}
                </span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-sm font-bold text-gray-400 uppercase tracking-wider">Capacity</span>
                <span className="text-gray-900 font-semibold">
                  {studio.capacity ? `${studio.capacity} pax` : 'N/A'}
                </span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-sm font-bold text-gray-400 uppercase tracking-wider">Size</span>
                <span className="text-gray-900 font-semibold">
                  {studio.size_sqm ? `${studio.size_sqm} sqm` : 'N/A'}
                </span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-sm font-bold text-gray-400 uppercase tracking-wider">Status</span>
                <span className={cn(
                  'font-semibold capitalize',
                  studio.status === 'active' || studio.status === 'published' ? 'text-emerald-600' : 'text-gray-600'
                )}>
                  {studio.status || 'Draft'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column (Sidebar) */}
        <div className="flex flex-col gap-8">
          {/* Amenities */}
          <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
            <h3 className="text-xl font-bold text-gray-900 mb-6">Amenities</h3>
            {amenities.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {amenities.map((amenity, index) => (
                  <span
                    key={index}
                    className="px-4 py-2 rounded-full bg-gray-50 text-sm font-medium text-gray-700 border border-gray-100"
                  >
                    {amenity}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-gray-400 italic text-sm">No amenities listed for this studio.</p>
            )}
          </div>

          {/* Map Card / Location */}
          <div className="bg-white rounded-2xl p-3 shadow-sm border border-gray-100">
            <div className="w-full aspect-square rounded-2xl bg-gray-200 overflow-hidden relative flex items-center justify-center">
              <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                <div className="bg-white p-2 rounded-full shadow-lg">
                  <MapPin className="h-8 w-8 text-gray-900" />
                </div>
              </div>
            </div>
            <div className="p-4 text-center">
              <p className="font-bold text-gray-900">
                {studio.address || studio.city || studio.location || 'No address available'}
              </p>
              {(studio.city || studio.country) && (
                <p className="text-sm text-gray-500 mt-0.5">
                  {[studio.city, studio.country].filter(Boolean).join(', ')}
                </p>
              )}
              <a href="#" className="text-gray-900 text-sm font-semibold hover:underline flex items-center justify-center gap-1 mt-1">
                Get Directions
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Add Space Modal */}
      <AddSpaceModal isOpen={isAddSpaceModalOpen} onClose={() => setIsAddSpaceModalOpen(false)} />
    </div>
  )
}
