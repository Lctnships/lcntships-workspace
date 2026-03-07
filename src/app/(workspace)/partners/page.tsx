'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import {
  Plus,
  Search,
  Download,
  MoreHorizontal,
  MapPin,
  User,
  Building2,
  X,
  Check,
  CloudUpload,
  Mail,
  Phone,
  Linkedin,
  ChevronRight,
  ChevronLeft,
  PartyPopper,
  Send,
  FileText,
  Loader2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { partnersApi, type Partner } from '@/lib/supabase'

// Display interface for partners
interface PartnerDisplay {
  id: string
  company_name: string
  contact_name: string
  location: string
  status: string
  type: string
  bookings_per_month: number
  revenue_share: number
  image: string
}

const statusConfig = {
  active: {
    label: 'Active',
    bgColor: 'bg-emerald-100',
    textColor: 'text-emerald-700',
    dotColor: 'bg-emerald-600',
  },
  pending: {
    label: 'Pending',
    bgColor: 'bg-amber-100',
    textColor: 'text-amber-700',
    dotColor: 'bg-amber-600',
  },
  inactive: {
    label: 'Inactive',
    bgColor: 'bg-rose-100',
    textColor: 'text-rose-700',
    dotColor: 'bg-rose-600',
  },
}

const studioTypes = ['All Types', 'Yoga', 'Pilates', 'Crossfit', 'Cycling', 'Photo', 'Music', 'Video', 'Podcast']

interface PartnerCardProps {
  partner: PartnerDisplay
}

function PartnerCard({ partner }: PartnerCardProps) {
  const status = statusConfig[partner.status as keyof typeof statusConfig]

  return (
    <Link href={`/partners/${partner.id}`}>
      <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-xl hover:border-indigo-200 transition-all group relative">
        <button className="absolute top-6 right-6 text-gray-400 hover:text-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity">
          <MoreHorizontal className="h-5 w-5" />
        </button>

        {/* Header with Avatar */}
        <div className="flex items-start gap-4 mb-6">
          <div className="w-16 h-16 rounded-full bg-indigo-50 flex items-center justify-center overflow-hidden border-2 border-white shadow-sm">
            {partner.image ? (
              <img
                src={partner.image}
                alt={partner.company_name}
                className="w-full h-full object-cover"
              />
            ) : (
              <Building2 className="h-8 w-8 text-indigo-400" />
            )}
          </div>
          <div className="flex flex-col">
            <h3 className="text-xl font-bold text-gray-900 group-hover:text-indigo-600 transition-colors">
              {partner.company_name}
            </h3>
            <div className="flex items-center gap-1.5 mt-1 text-gray-500">
              <User className="h-4 w-4" />
              <p className="text-sm font-medium">{partner.contact_name}</p>
            </div>
          </div>
        </div>

        {/* Location & Status */}
        <div className="space-y-3 mb-6">
          <div className="flex items-center gap-2 text-gray-500">
            <MapPin className="h-4 w-4" />
            <span className="text-sm">{partner.location}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className={cn(
              'px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1',
              status.bgColor,
              status.textColor
            )}>
              <span className={cn('w-1.5 h-1.5 rounded-full', status.dotColor)} />
              {status.label}
            </div>
            <div className="px-3 py-1 rounded-full bg-indigo-50 text-indigo-600 text-xs font-bold">
              {partner.type}
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="bg-gray-50 rounded-xl p-4 flex justify-between items-center">
          <div className="flex flex-col">
            <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Bookings</p>
            <p className="text-base font-bold text-gray-900">
              {partner.bookings_per_month > 0 ? `${partner.bookings_per_month}/mo` : '-'}
            </p>
          </div>
          <div className="h-8 w-px bg-gray-200" />
          <div className="flex flex-col items-end">
            <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Revenue Share</p>
            <p className="text-base font-bold text-indigo-600">{partner.revenue_share}%</p>
          </div>
        </div>
      </div>
    </Link>
  )
}

// Step Progress Indicator
function StepIndicator({ currentStep, totalSteps }: { currentStep: number; totalSteps: number }) {
  const steps = [
    { number: 1, label: 'Studio Info' },
    { number: 2, label: 'Owner Details' },
    { number: 3, label: 'Legal & Financial' },
    { number: 4, label: 'Review' },
  ]

  return (
    <div className="flex items-center justify-center gap-2 mb-8">
      {steps.map((step, index) => (
        <div key={step.number} className="flex items-center">
          <div className="flex flex-col items-center">
            <div
              className={cn(
                'w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all',
                currentStep > step.number
                  ? 'bg-emerald-500 text-white'
                  : currentStep === step.number
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-400'
              )}
            >
              {currentStep > step.number ? <Check className="h-5 w-5" /> : step.number}
            </div>
            <span
              className={cn(
                'text-xs font-medium mt-2 whitespace-nowrap',
                currentStep >= step.number ? 'text-gray-900' : 'text-gray-400'
              )}
            >
              {step.label}
            </span>
          </div>
          {index < steps.length - 1 && (
            <div
              className={cn(
                'w-16 h-0.5 mx-2 mb-6',
                currentStep > step.number ? 'bg-emerald-500' : 'bg-gray-200'
              )}
            />
          )}
        </div>
      ))}
    </div>
  )
}

// Add Partner Modal
interface AddPartnerModalProps {
  isOpen: boolean
  onClose: () => void
}

interface PartnerFormData {
  // Step 1: Studio Info
  studioName: string
  studioType: string
  address: string
  city: string
  postalCode: string
  country: string
  logoFile: File | null

  // Step 2: Owner Details
  ownerName: string
  ownerEmail: string
  ownerPhone: string
  ownerLinkedIn: string
  preferredContact: string

  // Step 3: Legal & Financial
  companyName: string
  vatNumber: string
  bankName: string
  iban: string
  revenueShare: string
}

function AddPartnerModal({ isOpen, onClose }: AddPartnerModalProps) {
  const [currentStep, setCurrentStep] = useState(1)
  const [showSuccess, setShowSuccess] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [formData, setFormData] = useState<PartnerFormData>({
    studioName: '',
    studioType: '',
    address: '',
    city: '',
    postalCode: '',
    country: '',
    logoFile: null,
    ownerName: '',
    ownerEmail: '',
    ownerPhone: '',
    ownerLinkedIn: '',
    preferredContact: 'email',
    companyName: '',
    vatNumber: '',
    bankName: '',
    iban: '',
    revenueShare: '15',
  })

  const updateFormData = (field: keyof PartnerFormData, value: string | File | null) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleNext = () => {
    if (currentStep < 4) {
      setCurrentStep(currentStep + 1)
    } else {
      // Submit form
      setShowSuccess(true)
    }
  }

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleClose = () => {
    setCurrentStep(1)
    setShowSuccess(false)
    setFormData({
      studioName: '',
      studioType: '',
      address: '',
      city: '',
      postalCode: '',
      country: '',
      logoFile: null,
      ownerName: '',
      ownerEmail: '',
      ownerPhone: '',
      ownerLinkedIn: '',
      preferredContact: 'email',
      companyName: '',
      vatNumber: '',
      bankName: '',
      iban: '',
      revenueShare: '15',
    })
    onClose()
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const files = e.dataTransfer.files
    if (files.length > 0) {
      updateFormData('logoFile', files[0])
    }
  }

  // Ensure component is mounted before using portal
   
  useEffect(() => {
    setMounted(true)
  }, [])

  if (!isOpen || !mounted) return null

  // Success Screen
  if (showSuccess) {
    return createPortal(
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm">
        <div className="bg-white rounded-3xl w-full max-w-lg mx-4 p-8 text-center animate-fade-in">
          <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <PartyPopper className="h-10 w-10 text-emerald-600" />
          </div>

          <h2 className="text-2xl font-bold text-gray-900 mb-2">Partner Added Successfully!</h2>
          <p className="text-gray-500 mb-8">
            {formData.studioName || 'The new partner'} has been added to your network. You can now manage their profile and settings.
          </p>

          <div className="bg-gray-50 rounded-2xl p-6 mb-8">
            <h3 className="text-sm font-bold text-gray-900 mb-4">Next Steps</h3>
            <div className="space-y-3 text-left">
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center">
                  <Check className="h-4 w-4 text-indigo-600" />
                </div>
                <span className="text-sm text-gray-600">Complete partner profile details</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center">
                  <span className="text-xs font-bold text-gray-400">2</span>
                </div>
                <span className="text-sm text-gray-600">Upload required documents</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center">
                  <span className="text-xs font-bold text-gray-400">3</span>
                </div>
                <span className="text-sm text-gray-600">Set up booking calendar</span>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1 h-12 rounded-xl"
              onClick={handleClose}
            >
              <FileText className="h-4 w-4 mr-2" />
              Go to Profile
            </Button>
            <Button
              className="flex-1 h-12 rounded-xl"
              onClick={handleClose}
            >
              <Send className="h-4 w-4 mr-2" />
              Send Welcome Email
            </Button>
          </div>
        </div>
      </div>,
      document.body
    )
  }

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-3xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-hidden flex flex-col animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Add New Partner</h2>
            <p className="text-sm text-gray-500">Step {currentStep} of 4</p>
          </div>
          <button
            onClick={handleClose}
            className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Step Indicator */}
        <div className="px-6 pt-6">
          <StepIndicator currentStep={currentStep} totalSteps={4} />
        </div>

        {/* Form Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Step 1: Studio Info */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-1">Studio Information</h3>
                <p className="text-sm text-gray-500">Enter the basic details about the studio</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Studio Name *</label>
                  <Input
                    placeholder="e.g., Zenith Yoga Studio"
                    value={formData.studioName}
                    onChange={(e) => updateFormData('studioName', e.target.value)}
                    className="h-12 rounded-xl"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Studio Type *</label>
                  <select
                    value={formData.studioType}
                    onChange={(e) => updateFormData('studioType', e.target.value)}
                    className="w-full h-12 rounded-xl border border-gray-200 px-4 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="">Select a type...</option>
                    <option value="Yoga">Yoga</option>
                    <option value="Pilates">Pilates</option>
                    <option value="Crossfit">Crossfit</option>
                    <option value="Cycling">Cycling</option>
                    <option value="Photo">Photography</option>
                    <option value="Music">Music</option>
                    <option value="Video">Video</option>
                    <option value="Podcast">Podcast</option>
                  </select>
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Street Address *</label>
                  <Input
                    placeholder="123 Main Street"
                    value={formData.address}
                    onChange={(e) => updateFormData('address', e.target.value)}
                    className="h-12 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">City *</label>
                  <Input
                    placeholder="San Francisco"
                    value={formData.city}
                    onChange={(e) => updateFormData('city', e.target.value)}
                    className="h-12 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Postal Code *</label>
                  <Input
                    placeholder="94102"
                    value={formData.postalCode}
                    onChange={(e) => updateFormData('postalCode', e.target.value)}
                    className="h-12 rounded-xl"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Country *</label>
                  <select
                    value={formData.country}
                    onChange={(e) => updateFormData('country', e.target.value)}
                    className="w-full h-12 rounded-xl border border-gray-200 px-4 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="">Select a country...</option>
                    <option value="US">United States</option>
                    <option value="UK">United Kingdom</option>
                    <option value="NL">Netherlands</option>
                    <option value="DE">Germany</option>
                    <option value="FR">France</option>
                  </select>
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Studio Logo</label>
                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    className={cn(
                      'border-2 border-dashed rounded-2xl p-8 text-center transition-all cursor-pointer',
                      isDragging
                        ? 'border-indigo-500 bg-indigo-50'
                        : 'border-gray-200 hover:border-indigo-400 hover:bg-gray-50'
                    )}
                    onClick={() => document.getElementById('logo-input')?.click()}
                  >
                    <input
                      id="logo-input"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          updateFormData('logoFile', e.target.files[0])
                        }
                      }}
                    />
                    <CloudUpload className="h-10 w-10 text-gray-400 mx-auto mb-3" />
                    {formData.logoFile ? (
                      <p className="text-sm font-medium text-indigo-600">{formData.logoFile.name}</p>
                    ) : (
                      <>
                        <p className="text-sm font-medium text-gray-700">
                          Drag and drop or <span className="text-indigo-600">browse</span>
                        </p>
                        <p className="text-xs text-gray-400 mt-1">PNG, JPG up to 5MB</p>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Owner Details */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-1">Owner Details</h3>
                <p className="text-sm text-gray-500">Enter the primary contact information</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Full Name *</label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <Input
                      placeholder="John Doe"
                      value={formData.ownerName}
                      onChange={(e) => updateFormData('ownerName', e.target.value)}
                      className="h-12 rounded-xl pl-12"
                    />
                  </div>
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Email Address *</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <Input
                      type="email"
                      placeholder="john@example.com"
                      value={formData.ownerEmail}
                      onChange={(e) => updateFormData('ownerEmail', e.target.value)}
                      className="h-12 rounded-xl pl-12"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number *</label>
                  <div className="relative">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <Input
                      type="tel"
                      placeholder="+1 234 567 890"
                      value={formData.ownerPhone}
                      onChange={(e) => updateFormData('ownerPhone', e.target.value)}
                      className="h-12 rounded-xl pl-12"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">LinkedIn (Optional)</label>
                  <div className="relative">
                    <Linkedin className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <Input
                      placeholder="linkedin.com/in/username"
                      value={formData.ownerLinkedIn}
                      onChange={(e) => updateFormData('ownerLinkedIn', e.target.value)}
                      className="h-12 rounded-xl pl-12"
                    />
                  </div>
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-3">Preferred Contact Method</label>
                  <div className="flex gap-3">
                    {['email', 'phone', 'whatsapp'].map((method) => (
                      <button
                        key={method}
                        onClick={() => updateFormData('preferredContact', method)}
                        className={cn(
                          'flex-1 h-12 rounded-xl border text-sm font-medium transition-all capitalize',
                          formData.preferredContact === method
                            ? 'border-indigo-600 bg-indigo-50 text-indigo-600'
                            : 'border-gray-200 text-gray-600 hover:border-gray-300'
                        )}
                      >
                        {method}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Legal & Financial */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-1">Legal & Financial Details</h3>
                <p className="text-sm text-gray-500">Enter the business and payment information</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Legal Company Name *</label>
                  <Input
                    placeholder="Company LLC"
                    value={formData.companyName}
                    onChange={(e) => updateFormData('companyName', e.target.value)}
                    className="h-12 rounded-xl"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">VAT / Tax Number *</label>
                  <Input
                    placeholder="NL123456789B01"
                    value={formData.vatNumber}
                    onChange={(e) => updateFormData('vatNumber', e.target.value)}
                    className="h-12 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Bank Name *</label>
                  <Input
                    placeholder="ING Bank"
                    value={formData.bankName}
                    onChange={(e) => updateFormData('bankName', e.target.value)}
                    className="h-12 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">IBAN *</label>
                  <Input
                    placeholder="NL12 INGB 1234 5678 90"
                    value={formData.iban}
                    onChange={(e) => updateFormData('iban', e.target.value)}
                    className="h-12 rounded-xl"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-3">Revenue Share Percentage</label>
                  <div className="flex gap-3">
                    {['10', '12.5', '15', '18', '20'].map((percentage) => (
                      <button
                        key={percentage}
                        onClick={() => updateFormData('revenueShare', percentage)}
                        className={cn(
                          'flex-1 h-12 rounded-xl border text-sm font-bold transition-all',
                          formData.revenueShare === percentage
                            ? 'border-indigo-600 bg-indigo-50 text-indigo-600'
                            : 'border-gray-200 text-gray-600 hover:border-gray-300'
                        )}
                      >
                        {percentage}%
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Review */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-1">Review & Submit</h3>
                <p className="text-sm text-gray-500">Please review all information before submitting</p>
              </div>

              {/* Studio Info Summary */}
              <div className="bg-gray-50 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-sm font-bold text-gray-900">Studio Information</h4>
                  <button
                    onClick={() => setCurrentStep(1)}
                    className="text-xs font-medium text-indigo-600 hover:underline"
                  >
                    Edit
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-400 text-xs uppercase tracking-wider mb-1">Studio Name</p>
                    <p className="text-gray-900 font-medium">{formData.studioName || '-'}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-xs uppercase tracking-wider mb-1">Type</p>
                    <p className="text-gray-900 font-medium">{formData.studioType || '-'}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-gray-400 text-xs uppercase tracking-wider mb-1">Address</p>
                    <p className="text-gray-900 font-medium">
                      {formData.address ? `${formData.address}, ${formData.city} ${formData.postalCode}, ${formData.country}` : '-'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Owner Details Summary */}
              <div className="bg-gray-50 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-sm font-bold text-gray-900">Owner Details</h4>
                  <button
                    onClick={() => setCurrentStep(2)}
                    className="text-xs font-medium text-indigo-600 hover:underline"
                  >
                    Edit
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-400 text-xs uppercase tracking-wider mb-1">Name</p>
                    <p className="text-gray-900 font-medium">{formData.ownerName || '-'}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-xs uppercase tracking-wider mb-1">Email</p>
                    <p className="text-gray-900 font-medium">{formData.ownerEmail || '-'}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-xs uppercase tracking-wider mb-1">Phone</p>
                    <p className="text-gray-900 font-medium">{formData.ownerPhone || '-'}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-xs uppercase tracking-wider mb-1">Preferred Contact</p>
                    <p className="text-gray-900 font-medium capitalize">{formData.preferredContact}</p>
                  </div>
                </div>
              </div>

              {/* Legal & Financial Summary */}
              <div className="bg-gray-50 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-sm font-bold text-gray-900">Legal & Financial</h4>
                  <button
                    onClick={() => setCurrentStep(3)}
                    className="text-xs font-medium text-indigo-600 hover:underline"
                  >
                    Edit
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-400 text-xs uppercase tracking-wider mb-1">Company Name</p>
                    <p className="text-gray-900 font-medium">{formData.companyName || '-'}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-xs uppercase tracking-wider mb-1">VAT Number</p>
                    <p className="text-gray-900 font-medium">{formData.vatNumber || '-'}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-xs uppercase tracking-wider mb-1">Bank</p>
                    <p className="text-gray-900 font-medium">{formData.bankName || '-'}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-xs uppercase tracking-wider mb-1">Revenue Share</p>
                    <p className="text-gray-900 font-medium">{formData.revenueShare}%</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-100 bg-gray-50">
          <Button
            variant="ghost"
            onClick={handleBack}
            disabled={currentStep === 1}
            className="h-12 px-6 rounded-xl"
          >
            <ChevronLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <Button
            onClick={handleNext}
            className="h-12 px-8 rounded-xl shadow-lg shadow-indigo-200"
          >
            {currentStep === 4 ? 'Submit Partner' : 'Continue'}
            {currentStep < 4 && <ChevronRight className="h-4 w-4 ml-2" />}
          </Button>
        </div>
      </div>
    </div>,
    document.body
  )
}

export default function PartnersPage() {
  const [partners, setPartners] = useState<PartnerDisplay[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string | null>(null)
  const [typeFilter, setTypeFilter] = useState('All Types')
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)

  // Fetch partners from Supabase
  useEffect(() => {
    async function fetchPartners() {
      try {
        const data = await partnersApi.getAll()
        setPartners((data || []).map((p: Partner) => ({
          id: p.id,
          company_name: p.company_name || '',
          contact_name: p.contact_name,
          location: p.city || '',
          status: p.status,
          type: p.tier || 'standard',
          bookings_per_month: p.studios_count || 0,
          revenue_share: p.commission_rate || 15,
          image: p.avatar_url || '',
        })))
      } catch (error) {
        console.error('Error fetching partners:', error)
        setPartners([])
      } finally {
        setLoading(false)
      }
    }
    fetchPartners()
  }, [])

  const filteredPartners = partners.filter((partner) => {
    const matchesSearch =
      partner.company_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      partner.contact_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      partner.location.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = !statusFilter || partner.status === statusFilter
    const matchesType = typeFilter === 'All Types' || partner.type === typeFilter

    return matchesSearch && matchesStatus && matchesType
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex flex-wrap justify-between items-end gap-3">
        <div className="flex flex-col gap-2">
          <h1 className="text-4xl font-black text-gray-900 tracking-tight">Partners</h1>
          <p className="text-gray-500">Manage and track your global studio network and collaborators.</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="rounded-full h-12 px-6">
            <Download className="h-4 w-4 mr-2" />
            Export List
          </Button>
          <Button
            className="rounded-full h-12 px-6 shadow-lg shadow-indigo-200"
            onClick={() => setIsAddModalOpen(true)}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Partner
          </Button>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
        <div className="flex flex-col gap-6">
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <Input
              placeholder="Search partners, owners, or locations..."
              className="pl-12 h-12 text-base rounded-full border-gray-200 bg-gray-50 focus:bg-white"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Filter Chips & Tabs */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex gap-2 items-center flex-wrap">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider mr-2">
                Filter by Status:
              </span>
              <Button
                variant={!statusFilter ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter(null)}
                className="rounded-full"
              >
                All Partners
              </Button>
              <Button
                variant={statusFilter === 'active' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter('active')}
                className="rounded-full"
              >
                <span className="w-2 h-2 rounded-full bg-emerald-500 mr-2" />
                Active
              </Button>
              <Button
                variant={statusFilter === 'pending' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter('pending')}
                className="rounded-full"
              >
                <span className="w-2 h-2 rounded-full bg-amber-500 mr-2" />
                Pending
              </Button>
              <Button
                variant={statusFilter === 'inactive' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter('inactive')}
                className="rounded-full"
              >
                <span className="w-2 h-2 rounded-full bg-rose-500 mr-2" />
                Inactive
              </Button>
            </div>

            {/* Type Tabs */}
            <div className="flex border-b border-gray-200 gap-4 overflow-x-auto">
              {studioTypes.slice(0, 5).map((type) => (
                <button
                  key={type}
                  onClick={() => setTypeFilter(type)}
                  className={cn(
                    'pb-2 px-1 text-sm font-bold border-b-2 transition-colors whitespace-nowrap',
                    typeFilter === type
                      ? 'border-indigo-600 text-indigo-600'
                      : 'border-transparent text-gray-400 hover:text-gray-600'
                  )}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Partner Cards Grid */}
      {partners.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
          <Building2 className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-1">Nog geen partners</h3>
          <p className="text-gray-500 mb-6">Voeg je eerste partner toe om je netwerk op te bouwen.</p>
          <Button
            className="rounded-full h-12 px-6 shadow-lg shadow-indigo-200"
            onClick={() => setIsAddModalOpen(true)}
          >
            <Plus className="h-4 w-4 mr-2" />
            Partner Toevoegen
          </Button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredPartners.map((partner) => (
              <PartnerCard key={partner.id} partner={partner} />
            ))}

            {/* Add New Partner Card */}
            <div
              onClick={() => setIsAddModalOpen(true)}
              className="bg-transparent border-2 border-dashed border-gray-200 rounded-2xl p-6 flex flex-col items-center justify-center text-center hover:border-indigo-400 hover:bg-white transition-all cursor-pointer group min-h-[320px]"
            >
              <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center mb-4 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
                <Plus className="h-8 w-8" />
              </div>
              <p className="text-lg font-bold text-gray-900">Add New Partner</p>
              <p className="text-sm text-gray-500 mt-2 px-6">
                Expand your network by adding another studio partner.
              </p>
            </div>
          </div>

          {filteredPartners.length === 0 && (
            <div className="text-center py-12 bg-gray-50 rounded-2xl">
              <Search className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Geen partners gevonden</h3>
              <p className="text-gray-500">Pas je filters of zoekopdracht aan</p>
            </div>
          )}
        </>
      )}

      {/* Add Partner Modal */}
      <AddPartnerModal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} />
    </div>
  )
}
